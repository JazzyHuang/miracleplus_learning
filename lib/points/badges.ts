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
 * 勋章服务类
 */
export class BadgesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 获取所有勋章定义
   */
  async getAllBadges(): Promise<Badge[]> {
    const { data, error } = await this.supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('order_index');

    if (error) {
      console.error('获取勋章列表失败:', error);
      return [];
    }

    return data.map(this.mapBadge);
  }

  /**
   * 获取用户已解锁的勋章
   */
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const { data, error } = await this.supabase
      .from('user_badges')
      .select(`
        unlocked_at,
        badge:badges (*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('获取用户勋章失败:', error);
      return [];
    }

    return data.map((ub) => ({
      badge: this.mapBadge(ub.badge),
      unlockedAt: ub.unlocked_at,
    }));
  }

  /**
   * 获取用户勋章统计
   */
  async getUserBadgeStats(userId: string): Promise<{
    total: number;
    unlocked: number;
    byCategory: Record<string, { total: number; unlocked: number }>;
  }> {
    // 获取所有勋章
    const allBadges = await this.getAllBadges();
    
    // 获取用户已解锁的勋章
    const userBadges = await this.getUserBadges(userId);
    const unlockedCodes = new Set(userBadges.map((ub) => ub.badge.code));

    // 按类别统计
    const byCategory: Record<string, { total: number; unlocked: number }> = {};
    
    for (const badge of allBadges) {
      if (!byCategory[badge.category]) {
        byCategory[badge.category] = { total: 0, unlocked: 0 };
      }
      byCategory[badge.category].total++;
      if (unlockedCodes.has(badge.code)) {
        byCategory[badge.category].unlocked++;
      }
    }

    return {
      total: allBadges.length,
      unlocked: userBadges.length,
      byCategory,
    };
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
      .from('badges')
      .select('*')
      .eq('code', badgeCode)
      .eq('is_active', true)
      .single();

    if (badgeError || !badge) {
      return { success: false, error: '勋章不存在' };
    }

    // 检查是否已解锁
    const { data: existing } = await this.supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .single();

    if (existing) {
      return { success: false, error: '勋章已解锁' };
    }

    // 解锁勋章
    const { error: unlockError } = await this.supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badge.id,
      });

    if (unlockError) {
      console.error('解锁勋章失败:', unlockError);
      return { success: false, error: unlockError.message };
    }

    // 发放奖励积分（如果有）
    let pointsAwarded = 0;
    if (badge.points_reward > 0) {
      const { data: points } = await this.supabase.rpc('add_user_points', {
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
   * 根据用户当前状态检查是否满足解锁条件
   */
  async checkAndUnlockBadges(userId: string): Promise<Badge[]> {
    const unlockedBadges: Badge[] = [];

    // 获取用户统计数据
    const stats = await this.getUserStats(userId);
    
    // 获取所有未解锁的勋章
    const allBadges = await this.getAllBadges();
    const userBadges = await this.getUserBadges(userId);
    const unlockedCodes = new Set(userBadges.map((ub) => ub.badge.code));

    for (const badge of allBadges) {
      if (unlockedCodes.has(badge.code)) continue;
      if (!badge.requirementType || badge.requirementValue === null) continue;

      const currentValue = stats[badge.requirementType] || 0;
      
      if (currentValue >= badge.requirementValue) {
        const result = await this.unlockBadge(userId, badge.code);
        if (result.success && result.badge) {
          unlockedBadges.push(result.badge);
        }
      }
    }

    return unlockedBadges;
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
    ] = await Promise.all([
      // 完成的课时数
      this.supabase
        .from('user_lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_completed', true),
      // Workshop 签到数
      this.supabase
        .from('workshop_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 作品提交数（未来表）
      Promise.resolve({ count: 0 }),
      // 回答问题数（未来表）
      Promise.resolve({ count: 0 }),
      // 笔记数（未来表）
      Promise.resolve({ count: 0 }),
      // 总积分
      this.supabase
        .from('user_point_balance')
        .select('total_points')
        .eq('user_id', userId)
        .single(),
      // 连续登录
      this.supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', userId)
        .single(),
    ]);

    stats.lessons_completed = lessonsResult.count || 0;
    stats.checkins = checkinsResult.count || 0;
    stats.submissions = submissionsResult.count || 0;
    stats.answers = answersResult.count || 0;
    stats.notes = notesResult.count || 0;
    stats.total_points = pointsResult.data?.total_points || 0;
    stats.streak = streakResult.data?.current_streak || 0;
    stats.longest_streak = streakResult.data?.longest_streak || 0;

    return stats;
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
