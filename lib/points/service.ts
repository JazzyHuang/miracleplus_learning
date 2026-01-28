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
import { POINT_RULES, PointActionType, getUserLevel } from './config';

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

    if (!points) {
      return {
        success: false,
        newBalance: 0,
        pointsAdded: 0,
        error: `未知的积分行为类型: ${actionType}`,
      };
    }

    try {
      const { data, error } = await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: points,
        p_action_type: actionType,
        p_reference_id: referenceId || null,
        p_reference_type: referenceType || null,
        p_description: description || null,
      });

      if (error) {
        console.error('添加积分失败:', error);
        return {
          success: false,
          newBalance: 0,
          pointsAdded: 0,
          error: error.message,
        };
      }

      const newBalance = data as number;
      const pointsAdded = newBalance > 0 ? points : 0;

      return {
        success: pointsAdded > 0,
        newBalance,
        pointsAdded,
      };
    } catch (err) {
      console.error('添加积分异常:', err);
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

    // 先检查余额
    const balance = await this.getPointBalance(userId);
    if (!balance || balance.availablePoints < points) {
      return {
        success: false,
        newBalance: balance?.availablePoints || 0,
        pointsAdded: 0,
        error: '积分余额不足',
      };
    }

    try {
      const { data, error } = await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: -points,  // 负数表示消费
        p_action_type: 'SPEND',
        p_reference_id: referenceId || null,
        p_reference_type: referenceType || null,
        p_description: description || null,
      });

      if (error) {
        return {
          success: false,
          newBalance: balance.availablePoints,
          pointsAdded: 0,
          error: error.message,
        };
      }

      return {
        success: true,
        newBalance: data as number,
        pointsAdded: -points,
      };
    } catch (err) {
      return {
        success: false,
        newBalance: balance.availablePoints,
        pointsAdded: 0,
        error: err instanceof Error ? err.message : '未知错误',
      };
    }
  }

  /**
   * 获取用户积分余额
   */
  async getPointBalance(userId: string): Promise<PointBalance | null> {
    const { data, error } = await this.supabase
      .from('user_point_balance')
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
      console.error('获取积分余额失败:', error);
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
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('获取积分流水失败:', error);
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
      const { data, error } = await this.supabase.rpc('update_user_streak', {
        p_user_id: userId,
      });

      if (error) {
        console.error('更新连续登录失败:', error);
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
      console.error('更新连续登录异常:', err);
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
    const { data, error } = await this.supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
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
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    // 直接从物化视图获取
    const { data, error } = await this.supabase
      .from('leaderboard_view')
      .select('*')
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('获取排行榜失败:', error);
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
   */
  private async getLeaderboardFallback(limit: number): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        name,
        avatar_url,
        user_point_balance (total_points, level),
        user_streaks (current_streak),
        user_badges (id)
      `)
      .neq('role', 'admin')
      .order('user_point_balance(total_points)', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取排行榜降级方案失败:', error);
      return [];
    }

    return data.map((user, index) => ({
      id: user.id,
      name: user.name || '匿名用户',
      avatarUrl: user.avatar_url,
      totalPoints: user.user_point_balance?.[0]?.total_points || 0,
      level: user.user_point_balance?.[0]?.level || 1,
      currentStreak: user.user_streaks?.[0]?.current_streak || 0,
      badgeCount: user.user_badges?.length || 0,
      rank: index + 1,
    }));
  }

  /**
   * 获取用户在排行榜中的排名
   */
  async getUserRank(userId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('leaderboard_view')
      .select('rank')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('获取用户排名失败:', error);
      return null;
    }

    return data.rank;
  }

  /**
   * 刷新排行榜（管理员操作）
   */
  async refreshLeaderboard(): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('refresh_leaderboard');
      if (error) {
        console.error('刷新排行榜失败:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('刷新排行榜异常:', err);
      return false;
    }
  }

  /**
   * 获取今日已获得的积分
   */
  async getTodayPoints(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('point_transactions')
      .select('points')
      .eq('user_id', userId)
      .gte('created_at', today)
      .gt('points', 0);

    if (error) {
      console.error('获取今日积分失败:', error);
      return 0;
    }

    return data.reduce((sum, t) => sum + t.points, 0);
  }
}

/**
 * 创建积分服务实例
 */
export function createPointsService(supabase: SupabaseClient): PointsService {
  return new PointsService(supabase);
}
