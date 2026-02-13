/**
 * 勋章服务
 * 
 * 提供勋章相关的业务逻辑，包括：
 * - 勋章查询
 * - 勋章解锁检查
 * - 用户勋章管理
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BADGE_CATEGORIES, BADGE_TIERS } from './config';
import { logger } from '@/lib/logger';
import { DB, RPC } from '@/lib/db-tables';

/**
 * 勋章定义
 */
export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  category: keyof typeof BADGE_CATEGORIES;
  tier: 1 | 2 | 3;
  pointsReward: number;
  requirementType: string | null;
  requirementValue: number | null;
  isActive: boolean;
}

/**
 * 用户勋章（包含解锁信息）
 */
export interface UserBadge {
  badge: Badge;
  unlockedAt: string;
}

/**
 * 勋章解锁检查结果
 */
export interface BadgeCheckResult {
  badgeCode: string;
  unlocked: boolean;
  currentProgress: number;
  requiredProgress: number;
}

/**
 * 勋章进度信息（含解锁状态和进度百分比）
 */
export interface BadgeProgress {
  badge: Badge;
  isUnlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  requiredProgress: number;
  progressPercent: number;
  /** 进度 >= 80%，用于"差一点"激励高亮 */
  isNearMiss: boolean;
}

/**
 * 勋章服务类
 */
export class BadgesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 获取所有勋章定义
   */
  async getAllBadges(): Promise<Badge[]> {
    const { data, error } = await this.supabase
      .from(DB.badges)
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('order_index');

    if (error) {
      logger.error('获取勋章列表失败:', error);
      return [];
    }

    return data.map(this.mapBadge);
  }

  /**
   * 获取用户已解锁的勋章
   */
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const { data, error } = await this.supabase
      .from(DB.user_badges)
      .select(`
        unlocked_at,
        badge:${DB.badges} (*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      logger.error('获取用户勋章失败:', error);
      return [];
    }

    return data
      .map((ub) => ({
        badge: ub.badge ? this.mapBadge(ub.badge as unknown as Record<string, unknown>) : undefined,
        unlockedAt: ub.unlocked_at,
      }))
      .filter((ub): ub is UserBadge => ub.badge !== undefined);
  }

  /**
   * 获取用户勋章统计
   */
  async getUserBadgeStats(userId: string): Promise<{
    total: number;
    unlocked: number;
    byCategory: Record<string, { total: number; unlocked: number }>;
  }> {
    // 性能优化：并行获取所有勋章和用户已解锁的勋章（消除串行等待）
    const [allBadges, userBadges] = await Promise.all([
      this.getAllBadges(),
      this.getUserBadges(userId),
    ]);
    const unlockedCodes = new Set(userBadges.map((ub) => ub.badge.code));

    // 按类别统计
    const byCategory: Record<string, { total: number; unlocked: number }> = {};
    
    for (const badge of allBadges) {
      const category = badge.category;
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, unlocked: 0 };
      }
      byCategory[category].total++;
      if (unlockedCodes.has(badge.code)) {
        const categoryData = byCategory[category];
        if (categoryData) {
          categoryData.unlocked++;
        }
      }
    }

    return {
      total: allBadges.length,
      unlocked: userBadges.length,
      byCategory,
    };
  }

  /**
   * 获取所有勋章的进度信息
   * 一次调用返回每个勋章的解锁状态、当前进度、所需进度和百分比
   */
  async getBadgeProgress(userId: string): Promise<BadgeProgress[]> {
    const [allBadges, userBadges, stats] = await Promise.all([
      this.getAllBadges(),
      this.getUserBadges(userId),
      this.getUserStats(userId),
    ]);

    const unlockedMap = new Map(
      userBadges.map(ub => [ub.badge.id, ub.unlockedAt])
    );

    return allBadges.map(badge => {
      const isUnlocked = unlockedMap.has(badge.id);
      const required = badge.requirementValue ?? 0;
      const rawCurrent = badge.requirementType
        ? (stats[badge.requirementType] ?? 0)
        : 0;
      const current = Math.min(rawCurrent, required);
      const percent = required > 0 ? (current / required) * 100 : 0;

      return {
        badge,
        isUnlocked,
        unlockedAt: unlockedMap.get(badge.id),
        currentProgress: isUnlocked ? required : current,
        requiredProgress: required,
        progressPercent: isUnlocked ? 100 : Math.round(percent),
        isNearMiss: !isUnlocked && percent >= 80,
      };
    });
  }

  /**
   * 解锁勋章
   */
  async unlockBadge(userId: string, badgeCode: string): Promise<{
    success: boolean;
    badge?: Badge;
    pointsAwarded?: number;
    error?: string;
  }> {
    // 查找勋章
    const { data: badge, error: badgeError } = await this.supabase
      .from(DB.badges)
      .select('*')
      .eq('code', badgeCode)
      .eq('is_active', true)
      .single();

    if (badgeError || !badge) {
      return { success: false, error: '勋章不存在' };
    }

    // 检查是否已解锁
    const { data: existing } = await this.supabase
      .from(DB.user_badges)
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .single();

    if (existing) {
      return { success: false, error: '勋章已解锁' };
    }

    // 解锁勋章
    const { error: unlockError } = await this.supabase
      .from(DB.user_badges)
      .insert({
        user_id: userId,
        badge_id: badge.id,
      });

    if (unlockError) {
      logger.error('解锁勋章失败:', unlockError);
      return { success: false, error: unlockError.message };
    }

    // 发放奖励积分（如果有）
    let pointsAwarded = 0;
    if (badge.points_reward > 0) {
      const { data: points } = await this.supabase.rpc(RPC.add_user_points, {
        p_user_id: userId,
        p_points: badge.points_reward,
        p_action_type: 'BADGE_REWARD',
        p_reference_id: badge.id,
        p_reference_type: 'badge',
        p_description: `解锁勋章: ${badge.name}`,
      });
      pointsAwarded = points || 0;
    }

    return {
      success: true,
      badge: this.mapBadge(badge),
      pointsAwarded,
    };
  }

  /**
   * 检查并自动解锁勋章
   * 性能优化：批量收集满足条件的勋章后一次性处理（消除 N+1 查询）
   */
  async checkAndUnlockBadges(userId: string): Promise<Badge[]> {
    // 性能优化：并行获取统计数据、所有勋章和用户已解锁勋章（消除 3 次串行等待）
    const [stats, allBadges, userBadges] = await Promise.all([
      this.getUserStats(userId),
      this.getAllBadges(),
      this.getUserBadges(userId),
    ]);
    const unlockedCodes = new Set(userBadges.map((ub) => ub.badge.code));

    // Batch: collect all badges that should be unlocked
    const badgesToUnlock = allBadges.filter(badge => {
      if (unlockedCodes.has(badge.code)) return false;
      if (!badge.requirementType || badge.requirementValue === null) return false;
      const currentValue = stats[badge.requirementType] || 0;
      return currentValue >= badge.requirementValue;
    });

    if (badgesToUnlock.length === 0) return [];

    // Batch insert all qualifying badges at once
    const inserts = badgesToUnlock.map(badge => ({
      user_id: userId,
      badge_id: badge.id,
    }));

    const { error } = await this.supabase
      .from(DB.user_badges)
      .upsert(inserts, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });

    if (error) {
      logger.error('批量解锁勋章失败:', error);
      return [];
    }

    // Award badge points for each newly unlocked badge
    for (const badge of badgesToUnlock) {
      if (badge.pointsReward > 0) {
        try {
          const { error: rpcError } = await this.supabase.rpc(RPC.add_user_points, {
            p_user_id: userId,
            p_points: badge.pointsReward,
            p_action_type: 'BADGE_REWARD',
            p_reference_id: badge.id,
            p_reference_type: 'badge',
            p_description: `解锁勋章: ${badge.name}`,
          });
          if (rpcError) {
            logger.error('勋章积分奖励失败:', { badgeId: badge.id, badgeName: badge.name, error: rpcError });
          }
        } catch (err) {
          logger.error('勋章积分奖励异常:', { badgeId: badge.id, badgeName: badge.name, error: err });
        }
      }
    }

    return badgesToUnlock;
  }

  /**
   * 获取用户统计数据（用于勋章解锁检查）
   */
  private async getUserStats(userId: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    // 并行获取各项统计
    const [
      lessonsResult,
      checkinsResult,
      submissionsResult,
      answersResult,
      notesResult,
      pointsResult,
      streakResult,
      questionsResult,
      acceptedAnswersResult,
      notesUploadedResult,
      totalLikesResult,
    ] = await Promise.all([
      // 完成的课时数
      this.supabase
        .from(DB.user_lesson_progress)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_completed', true),
      // Workshop 签到数
      this.supabase
        .from(DB.workshop_checkins)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 作品提交数
      this.supabase
        .from(DB.workshop_submissions)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['approved', 'featured']),
      // 回答问题数
      this.supabase
        .from(DB.qa_answers)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 笔记数 (旧字段名保留兼容)
      this.supabase
        .from(DB.course_notes)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 总积分
      this.supabase
        .from(DB.user_point_balance)
        .select('total_points')
        .eq('user_id', userId)
        .single(),
      // 连续登录
      this.supabase
        .from(DB.user_streaks)
        .select('current_streak, longest_streak')
        .eq('user_id', userId)
        .single(),
      // 提问数 (提问达人徽章)
      this.supabase
        .from(DB.qa_questions)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 被采纳回答数 (热心助人徽章)
      this.supabase
        .from(DB.qa_answers)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_accepted', true),
      // 上传公开笔记数 (笔记达人徽章)
      this.supabase
        .from(DB.course_notes)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_public', true),
      // 获赞总数 (社交达人徽章) — 统计该用户的讨论收到的赞
      // Note: Previously counted ALL likes globally; now scoped to user's own discussions
      this.getUserReceivedLikesCount(userId),
    ]);

    stats.lessons_completed = lessonsResult.count || 0;
    stats.checkins = checkinsResult.count || 0;
    stats.submissions = submissionsResult.count || 0;
    stats.answers = answersResult.count || 0;
    stats.notes = notesResult.count || 0;
    stats.total_points = pointsResult.data?.total_points || 0;
    stats.streak = streakResult.data?.current_streak || 0;
    stats.longest_streak = streakResult.data?.longest_streak || 0;
    // New stats for operations plan badges
    stats.qa_questions = questionsResult.count || 0;
    stats.accepted_answers = acceptedAnswersResult.count || 0;
    stats.notes_uploaded = notesUploadedResult.count || 0;
    stats.total_likes_received = totalLikesResult.count || 0;

    return stats;
  }

  /**
   * Count total likes received by a user across their discussions, comments, and submissions
   * Security fix: Previously counted global likes — now correctly scoped to user's content
   */
  private async getUserReceivedLikesCount(userId: string): Promise<{ count: number | null }> {
    // Get user's discussion IDs
    const { data: discussions } = await this.supabase
      .from(DB.discussions)
      .select('id')
      .eq('user_id', userId);

    const discussionIds = discussions?.map(d => d.id) || [];

    if (discussionIds.length === 0) {
      return { count: 0 };
    }

    const { count } = await this.supabase
      .from(DB.likes)
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'discussion')
      .in('target_id', discussionIds);

    return { count: count || 0 };
  }

  /**
   * 映射数据库记录到 Badge 类型
   */
  private mapBadge(data: Record<string, unknown>): Badge {
    return {
      id: data.id as string,
      code: data.code as string,
      name: data.name as string,
      description: data.description as string | null,
      iconUrl: data.icon_url as string | null,
      category: data.category as keyof typeof BADGE_CATEGORIES,
      tier: data.tier as 1 | 2 | 3,
      pointsReward: data.points_reward as number,
      requirementType: data.requirement_type as string | null,
      requirementValue: data.requirement_value as number | null,
      isActive: data.is_active as boolean,
    };
  }
}

/**
 * 创建勋章服务实例
 */
export function createBadgesService(supabase: SupabaseClient): BadgesService {
  return new BadgesService(supabase);
}

/**
 * 获取勋章类别显示名称
 */
export function getBadgeCategoryName(category: string): string {
  return BADGE_CATEGORIES[category as keyof typeof BADGE_CATEGORIES] || category;
}

/**
 * 获取勋章等级信息
 */
export function getBadgeTierInfo(tier: number): { name: string; color: string } {
  return BADGE_TIERS[tier as keyof typeof BADGE_TIERS] || BADGE_TIERS[1];
}
