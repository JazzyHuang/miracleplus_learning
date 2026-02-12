/**
 * 积分服务
 * 
 * 提供积分相关的业务逻辑，包括：
 * - 积分发放（通过数据库函数保证原子性）
 * - 积分查询
 * - 排行榜
 * - 连续登录
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { POINT_RULES, type PointActionType, getUserLevel } from './config';
import { logger } from '@/lib/logger';
import { DB, RPC } from '@/lib/db-tables';

/**
 * 积分余额信息
 */
export interface PointBalance {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  level: number;
  levelName: string;
}

/**
 * 积分流水记录
 */
export interface PointTransaction {
  id: string;
  userId: string;
  points: number;
  actionType: PointActionType;
  referenceId?: string;
  referenceType?: string;
  description?: string;
  createdAt: string;
}

/**
 * 连续登录信息
 */
export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  streakStartDate: string | null;
}

/**
 * 排行榜条目
 */
export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  level: number;
  currentStreak: number;
  badgeCount: number;
  rank: number;
}

/**
 * 添加积分结果
 */
export interface AddPointsResult {
  success: boolean;
  newBalance: number;
  pointsAdded: number;
  error?: string;
}

/**
 * 更新连续登录结果
 */
export interface UpdateStreakResult {
  currentStreak: number;
  longestStreak: number;
  pointsEarned: number;
  badgeUnlocked: string | null;
}

/**
 * 积分服务类
 */
export class PointsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 添加积分
   * 通过数据库函数保证原子性和并发安全
   */
  async addPoints(
    userId: string,
    actionType: PointActionType,
    referenceId?: string,
    referenceType?: string,
    description?: string
  ): Promise<AddPointsResult> {
    const points = POINT_RULES[actionType];

    // 修复：使用严格检查，0 是合法值（如 BADGE_REWARD、SPEND）
    if (points === undefined || points === null) {
      return {
        success: false,
        newBalance: 0,
        pointsAdded: 0,
        error: `未知的积分行为类型: ${actionType}`,
      };
    }

    // 0 积分的行为类型（如 BADGE_REWARD）不需要执行 RPC
    if (points === 0) {
      return { success: true, newBalance: 0, pointsAdded: 0 };
    }

    try {
      // 安全修复：移除应用层的每日限制检查（存在 TOCTOU 竞态条件）
      // 这些检查在高并发下可被绕过 — 所有限制已在 RPC ml_add_user_points 中原子检查
      // RPC 内部使用 pg_advisory_xact_lock 保证并发安全

      const { data, error } = await this.supabase.rpc(RPC.add_user_points, {
        p_user_id: userId,
        p_points: points,
        p_action_type: actionType,
        p_reference_id: referenceId || null,
        p_reference_type: referenceType || null,
        p_description: description || null,
      });

      if (error) {
        logger.error('添加积分失败:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId,
          actionType,
          points,
        });
        return {
          success: false,
          newBalance: 0,
          pointsAdded: 0,
          error: error.message,
        };
      }

      // RPC returns the new total balance (or 0 if daily limit reached)
      const newBalance = (data as number) ?? 0;
      // If RPC returned 0, it means daily limit was hit and no points were added
      // Otherwise, points were successfully added
      const pointsAdded = (data !== null && data !== undefined && data !== 0) ? points : 0;

      return {
        success: pointsAdded > 0 || newBalance > 0,
        newBalance,
        pointsAdded,
      };
    } catch (err) {
      logger.error('添加积分异常:', {
        error: err instanceof Error ? err.message : String(err),
        userId,
        actionType,
        points,
      });
      return {
        success: false,
        newBalance: 0,
        pointsAdded: 0,
        error: err instanceof Error ? err.message : '未知错误',
      };
    }
  }

  /**
   * 消费积分
   */
  async spendPoints(
    userId: string,
    points: number,
    referenceId?: string,
    referenceType?: string,
    description?: string
  ): Promise<AddPointsResult> {
    if (points <= 0) {
      return {
        success: false,
        newBalance: 0,
        pointsAdded: 0,
        error: '消费积分必须大于0',
      };
    }

    try {
      // 原子操作：直接通过 RPC 扣减，数据库函数内部检查余额
      const { data, error } = await this.supabase.rpc(RPC.add_user_points, {
        p_user_id: userId,
        p_points: -points,
        p_action_type: 'SPEND',
        p_reference_id: referenceId || null,
        p_reference_type: referenceType || null,
        p_description: description || null,
      });

      if (error) {
        logger.error('消费积分失败:', { error, userId, points });
        return {
          success: false,
          newBalance: 0,
          pointsAdded: 0,
          error: '积分余额不足',
        };
      }

      return {
        success: true,
        newBalance: data as number,
        pointsAdded: -points,
      };
    } catch (err) {
      logger.error('消费积分异常:', { error: err, userId, points });
      return {
        success: false,
        newBalance: 0,
        pointsAdded: 0,
        error: '操作失败，请稍后重试',
      };
    }
  }

  /**
   * 获取用户积分余额
   */
  async getPointBalance(userId: string): Promise<PointBalance | null> {
    try {
      const { data, error } = await this.supabase
        .from(DB.user_point_balance)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 如果用户没有积分记录，返回默认值
        if (error.code === 'PGRST116') {
          const level = getUserLevel(0);
          return {
            userId,
            totalPoints: 0,
            availablePoints: 0,
            spentPoints: 0,
            level: level.level,
            levelName: level.name,
          };
        }
        // 改进错误日志，输出完整的错误信息
        logger.error('获取积分余额失败:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId,
        });
        return null;
      }

      const level = getUserLevel(data.total_points);
      return {
        userId: data.user_id,
        totalPoints: data.total_points,
        availablePoints: data.available_points,
        spentPoints: data.spent_points,
        level: level.level,
        levelName: level.name,
      };
    } catch (err) {
      logger.error('获取积分余额异常:', {
        error: err instanceof Error ? err.message : String(err),
        userId,
      });
      return null;
    }
  }

  /**
   * 获取用户积分流水
   */
  async getPointTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PointTransaction[]> {
    const { data, error } = await this.supabase
      .from(DB.point_transactions)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('获取积分流水失败:', error);
      return [];
    }

    return data.map((t) => ({
      id: t.id,
      userId: t.user_id,
      points: t.points,
      actionType: t.action_type as PointActionType,
      referenceId: t.reference_id,
      referenceType: t.reference_type,
      description: t.description,
      createdAt: t.created_at,
    }));
  }

  /**
   * 更新连续登录
   */
  async updateStreak(userId: string): Promise<UpdateStreakResult> {
    try {
      const { data, error } = await this.supabase.rpc(RPC.update_user_streak, {
        p_user_id: userId,
      });

      if (error) {
        logger.error('更新连续登录失败:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId,
        });
        return {
          currentStreak: 0,
          longestStreak: 0,
          pointsEarned: 0,
          badgeUnlocked: null,
        };
      }

      // 数据库函数返回的是数组
      const result = data?.[0] || data;
      return {
        currentStreak: result?.current_streak || 0,
        longestStreak: result?.longest_streak || 0,
        pointsEarned: result?.points_earned || 0,
        badgeUnlocked: result?.badge_unlocked || null,
      };
    } catch (err) {
      logger.error('更新连续登录异常:', {
        error: err instanceof Error ? err.message : String(err),
        userId,
      });
      return {
        currentStreak: 0,
        longestStreak: 0,
        pointsEarned: 0,
        badgeUnlocked: null,
      };
    }
  }

  /**
   * 获取用户连续登录信息
   */
  async getUserStreak(userId: string): Promise<UserStreak> {
    try {
      const { data, error } = await this.supabase
        .from(DB.user_streaks)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 如果记录不存在，返回默认值
        if (error.code === 'PGRST116') {
          return {
            currentStreak: 0,
            longestStreak: 0,
            lastLoginDate: null,
            streakStartDate: null,
          };
        }
        logger.error('获取用户连续登录失败:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId,
        });
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastLoginDate: null,
          streakStartDate: null,
        };
      }

      return {
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastLoginDate: data.last_login_date,
        streakStartDate: data.streak_start_date,
      };
    } catch (err) {
      logger.error('获取用户连续登录异常:', {
        error: err instanceof Error ? err.message : String(err),
        userId,
      });
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: null,
        streakStartDate: null,
      };
    }
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    // 直接从物化视图获取
    const { data, error } = await this.supabase
      .from(DB.leaderboard_view)
      .select('*')
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('获取排行榜失败:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        limit,
      });
      // 降级方案：直接查询
      return this.getLeaderboardFallback(limit);
    }

    return data.map((entry) => ({
      id: entry.id,
      name: entry.name || '匿名用户',
      avatarUrl: entry.avatar_url,
      totalPoints: entry.total_points,
      level: entry.level,
      currentStreak: entry.current_streak,
      badgeCount: entry.badge_count,
      rank: entry.rank,
    }));
  }

  /**
   * 降级方案：直接查询排行榜
   * 注意：Supabase 客户端不支持嵌套排序，需要在内存中排序
   */
  private async getLeaderboardFallback(limit: number): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from(DB.users)
        .select(`
          id,
          name,
          avatar_url,
          user_point_balance:${DB.user_point_balance} (total_points, level),
          user_streaks:${DB.user_streaks} (current_streak),
          user_badges:${DB.user_badges} (count)
        `)
        .neq('role', 'admin')
        .limit(limit * 2); // 获取更多数据，因为排序后会过滤

      if (error) {
        logger.error('获取排行榜降级方案失败:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          limit,
        });
        return [];
      }

      // 在内存中排序
      const sorted = data
        .map((user) => ({
          id: user.id,
          name: user.name || '匿名用户',
          avatarUrl: user.avatar_url,
          totalPoints: user.user_point_balance?.[0]?.total_points || 0,
          level: user.user_point_balance?.[0]?.level || 1,
          currentStreak: user.user_streaks?.[0]?.current_streak || 0,
          badgeCount: user.user_badges?.[0]?.count || 0,
        }))
        .filter((u) => u.totalPoints > 0) // 只显示有积分的用户
        .sort((a, b) => b.totalPoints - a.totalPoints) // 按积分降序
        .slice(0, limit); // 取前 N 名

      // 添加排名
      return sorted.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
    } catch (err) {
      logger.error('获取排行榜降级方案异常:', {
        error: err instanceof Error ? err.message : String(err),
        limit,
      });
      return [];
    }
  }

  /**
   * 获取用户在排行榜中的排名
   */
  async getUserRank(userId: string): Promise<number | null> {
    // 使用 maybeSingle 而不是 single，避免"not found"错误
    // 管理员用户不在排行榜中（视图排除了管理员），这是正常情况
    const { data, error } = await this.supabase
      .from(DB.leaderboard_view)
      .select('rank')
      .eq('id', userId)
      .maybeSingle();

    // 如果是"not found"错误（PGRST116），说明用户可能是管理员或不在排行榜中
    // 这不是真正的错误，只是没有排名，返回 null 即可
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      // 其他错误才记录日志
      logger.error('获取用户排名失败:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
      });
      return null;
    }

    // 如果没有找到（管理员或新用户），返回 null
    if (!data) {
      return null;
    }

    return data.rank;
  }

  /**
   * 刷新排行榜（管理员操作）
   */
  async refreshLeaderboard(): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc(RPC.refresh_leaderboard);
      if (error) {
        logger.error('刷新排行榜失败:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return false;
      }
      return true;
    } catch (err) {
      logger.error('刷新排行榜异常:', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * 获取今日已获得的积分
   */
  async getTodayPoints(userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc(RPC.get_today_points_sum, {
        p_user_id: userId,
      });

      if (error) {
        logger.error('获取今日积分失败:', {
          code: error.code,
          message: error.message,
          userId,
        });
        return 0;
      }

      return data ?? 0;
    } catch (err) {
      logger.error('获取今日积分异常:', {
        error: err instanceof Error ? err.message : String(err),
        userId,
      });
      return 0;
    }
  }

  /**
   * 购买 Streak Freeze（消耗 100 积分，最多持有 2 个）
   */
  async purchaseStreakFreeze(userId: string): Promise<{ success: boolean; freezeCount: number; error?: string }> {
    try {
      // 检查当前 freeze 数量
      const { data: streak, error: streakError } = await this.supabase
        .from(DB.user_streaks)
        .select('freeze_count')
        .eq('user_id', userId)
        .single();

      if (streakError || !streak) {
        return { success: false, freezeCount: 0, error: '未找到连续登录记录' };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentFreezeCount = (streak as any).freeze_count ?? 0;
      if (currentFreezeCount >= 2) {
        return { success: false, freezeCount: currentFreezeCount, error: '最多持有 2 个保护' };
      }

      // 扣减积分
      const spendResult = await this.spendPoints(userId, 100, undefined, 'streak_freeze', '购买连续登录保护');
      if (!spendResult.success) {
        return { success: false, freezeCount: currentFreezeCount, error: spendResult.error || '积分不足' };
      }

      // 增加 freeze_count
      const newCount = currentFreezeCount + 1;
      await this.supabase
        .from(DB.user_streaks)
        .update({ freeze_count: newCount })
        .eq('user_id', userId);

      return { success: true, freezeCount: newCount };
    } catch (err) {
      logger.error('购买 Streak Freeze 失败:', err);
      return { success: false, freezeCount: 0, error: '操作失败' };
    }
  }

  /**
   * 获取用户 Streak Freeze 数量
   */
  async getStreakFreezeCount(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from(DB.user_streaks)
      .select('freeze_count')
      .eq('user_id', userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any)?.freeze_count ?? 0;
  }
}

/**
 * 创建积分服务实例
 */
export function createPointsService(supabase: SupabaseClient): PointsService {
  return new PointsService(supabase);
}
