/**
 * 讨论区服务
 * 
 * 提供讨论话题相关的业务逻辑
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Discussion } from '@/types/database';

/**
 * 讨论区服务类
 */
export class DiscussionsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 获取讨论列表
   */
  async getDiscussions(options: {
    limit?: number;
    offset?: number;
    tag?: string;
    sortBy?: 'latest' | 'popular' | 'trending';
  } = {}): Promise<{ discussions: Discussion[]; total: number }> {
    const { limit = 20, offset = 0, tag, sortBy = 'latest' } = options;

    let query = this.supabase
      .from('discussions')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `, { count: 'exact' })
      .eq('status', 'active');

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // 排序
    switch (sortBy) {
      case 'popular':
        query = query
          .order('is_pinned', { ascending: false })
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'trending':
        query = query
          .order('is_pinned', { ascending: false })
          .order('participant_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'latest':
      default:
        query = query
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('获取讨论列表失败:', error);
      return { discussions: [], total: 0 };
    }

    return {
      discussions: data as Discussion[],
      total: count || 0,
    };
  }

  /**
   * 获取单个讨论详情
   */
  async getDiscussionById(id: string): Promise<Discussion | null> {
    const { data, error } = await this.supabase
      .from('discussions')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('获取讨论详情失败:', error);
      return null;
    }

    // 增加浏览量
    await this.supabase
      .from('discussions')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id);

    return data as Discussion;
  }

  /**
   * 创建讨论话题
   */
  async createDiscussion(
    userId: string,
    data: {
      title: string;
      content: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; discussion?: Discussion; pointsEarned?: number; error?: string }> {
    if (data.content.length < 20) {
      return { success: false, error: '内容至少 20 个字' };
    }

    try {
      const { data: discussion, error } = await this.supabase
        .from('discussions')
        .insert({
          user_id: userId,
          title: data.title,
          content: data.content,
          tags: data.tags || null,
        })
        .select(`
          *,
          user:users (id, name, email, avatar_url)
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 添加创建者为参与者
      await this.supabase
        .from('discussion_participants')
        .insert({
          user_id: userId,
          discussion_id: discussion.id,
        });

      // 发放积分
      const { data: points } = await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: 20,
        p_action_type: 'CREATE_DISCUSSION',
        p_reference_id: discussion.id,
        p_reference_type: 'discussion',
        p_description: '发布讨论话题',
      });

      return {
        success: true,
        discussion: discussion as Discussion,
        pointsEarned: points || 0,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
    }
  }

  /**
   * 检查并奖励热门话题
   * 当参与人数超过 10 人时，给话题创建者额外积分
   */
  async checkAndRewardPopularDiscussion(discussionId: string): Promise<void> {
    const { data: discussion } = await this.supabase
      .from('discussions')
      .select('user_id, participant_count')
      .eq('id', discussionId)
      .single();

    if (!discussion || discussion.participant_count < 10) return;

    // 检查是否已经奖励过
    const { data: existingReward } = await this.supabase
      .from('point_transactions')
      .select('id')
      .eq('user_id', discussion.user_id)
      .eq('action_type', 'POPULAR_DISCUSSION')
      .eq('reference_id', discussionId)
      .single();

    if (existingReward) return;

    // 发放奖励
    await this.supabase.rpc('add_user_points', {
      p_user_id: discussion.user_id,
      p_points: 100,
      p_action_type: 'POPULAR_DISCUSSION',
      p_reference_id: discussionId,
      p_reference_type: 'discussion',
      p_description: '发起的话题参与人数超过10人',
    });
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(limit: number = 10): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('discussions')
      .select('tags')
      .eq('status', 'active')
      .not('tags', 'is', null);

    if (error || !data) return [];

    // 统计标签出现次数
    const tagCounts: Record<string, number> = {};
    data.forEach((d) => {
      (d.tags || []).forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // 排序并返回前 N 个
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }
}

/**
 * 创建讨论区服务实例
 */
export function createDiscussionsService(supabase: SupabaseClient): DiscussionsService {
  return new DiscussionsService(supabase);
}
