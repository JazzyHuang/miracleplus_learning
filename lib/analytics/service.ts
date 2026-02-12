/**
 * 用户行为分析服务
 *
 * 遵循 PointsService 模式：构造函数注入 SupabaseClient
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DB, RPC } from '@/lib/db-tables';
import { logger } from '@/lib/logger';
import type {
  AnalyticsOverview, DailyActivity, CohortRetentionRow,
  LearningFunnel, UserSegment, ContentStats,
  UserEngagement, UserDetail, ActionBreakdown, EngagementDistribution,
} from './types';

export class AnalyticsService {
  constructor(private supabase: SupabaseClient) {}

  async getOverview(days = 30): Promise<AnalyticsOverview | null> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_overview, { p_days: days });
    if (error) { logger.error('analytics_overview failed', error); return null; }
    return this.camelizeOverview(data as Record<string, unknown>);
  }

  async getActivityTrends(startDate: string, endDate: string): Promise<DailyActivity[]> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_activity_trends, {
      p_start_date: startDate, p_end_date: endDate,
    });
    if (error) { logger.error('analytics_activity_trends failed', error); return []; }
    return (data ?? []) as DailyActivity[];
  }

  async getCohortRetention(): Promise<CohortRetentionRow[]> {
    const { data, error } = await this.supabase
      .from(DB.analytics_cohort_retention)
      .select('*')
      .order('cohort_month')
      .order('month_offset');
    if (error) { logger.error('cohort_retention query failed', error); return []; }
    return (data ?? []) as CohortRetentionRow[];
  }
  async getLearningFunnel(days = 30): Promise<LearningFunnel | null> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_learning_funnel, { p_days: days });
    if (error) { logger.error('analytics_learning_funnel failed', error); return null; }
    return data as LearningFunnel;
  }

  async getUserSegments(): Promise<UserSegment[]> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_user_segments);
    if (error) { logger.error('analytics_user_segments failed', error); return []; }
    return (data ?? []) as UserSegment[];
  }

  async getContentStats(): Promise<ContentStats[]> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_content_stats);
    if (error) { logger.error('analytics_content_stats failed', error); return []; }
    return (data ?? []) as ContentStats[];
  }

  async getUserEngagementList(opts: {
    segment?: string; limit?: number; offset?: number;
  } = {}): Promise<UserEngagement[]> {
    let query = this.supabase
      .from(DB.analytics_user_engagement)
      .select('*')
      .order('engagement_score', { ascending: false })
      .limit(opts.limit ?? 50)
      .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);
    if (opts.segment) query = query.eq('segment', opts.segment);
    const { data, error } = await query;
    if (error) { logger.error('user_engagement query failed', error); return []; }
    return (data ?? []) as UserEngagement[];
  }

  async getUserDetail(userId: string): Promise<UserDetail | null> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_user_detail, { p_user_id: userId });
    if (error) { logger.error('analytics_user_detail failed', error); return null; }
    return data as UserDetail;
  }

  async getActionBreakdown(days = 30): Promise<ActionBreakdown[]> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_action_breakdown, { p_days: days });
    if (error) { logger.error('analytics_action_breakdown failed', error); return []; }
    return (data ?? []) as ActionBreakdown[];
  }

  async getEngagementDistribution(): Promise<EngagementDistribution[]> {
    const { data, error } = await this.supabase.rpc(RPC.analytics_engagement_distribution);
    if (error) { logger.error('analytics_engagement_distribution failed', error); return []; }
    return (data ?? []) as EngagementDistribution[];
  }

  private camelizeOverview(raw: Record<string, unknown>): AnalyticsOverview {
    const wau = Number(raw.wau) || 0;
    const mau = Number(raw.mau) || 0;
    return {
      totalUsers: Number(raw.total_users) || 0,
      newUsersPeriod: Number(raw.new_users_period) || 0,
      newUsersPrev: Number(raw.new_users_prev) || 0,
      dauAvg: Number(raw.dau_avg) || 0,
      dauAvgPrev: Number(raw.dau_avg_prev) || 0,
      wau, mau,
      lessonsCompletedPeriod: Number(raw.lessons_completed_period) || 0,
      lessonsCompletedPrev: Number(raw.lessons_completed_prev) || 0,
      avgTimeSpent: Number(raw.avg_time_spent) || 0,
      workshopParticipants: Number(raw.workshop_participants) || 0,
      communityPosts: Number(raw.community_posts) || 0,
      avgEngagementScore: Number(raw.avg_engagement_score) || 0,
      levelDistribution: (raw.level_distribution as AnalyticsOverview['levelDistribution']) ?? [],
      dailyTrend: (raw.daily_trend as AnalyticsOverview['dailyTrend']) ?? [],
    };
  }
}

export function createAnalyticsService(supabase: SupabaseClient) {
  return new AnalyticsService(supabase);
}
