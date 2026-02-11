/**
 * 讨论区服务
 * 
 * 提供讨论话题相关的业务逻辑
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Discussion } from '@/types/database';
import { logger } from '@/lib/logger';
import { DB, RPC } from '@/lib/db-tables';

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
      .from(DB.discussions)
      .select(`
        id, title, content, tags, comment_count, like_count, participant_count,
        is_pinned, is_featured, status, created_at, updated_at, user_id, view_count,
        user:${DB.users}!${DB.discussions}_user_id_fkey (id, name, avatar_url)
      `)
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

    const { data, error } = await query;

    if (error) {
      logger.error('获取讨论列表失败', new Error(String(error.message)), {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { discussions: [], total: 0 };
    }

    const discussions = (data ?? []) as unknown as Discussion[];
    return {
      discussions,
      total: discussions.length,
    };
  }

  /**
   * 获取单个讨论详情（纯查询，无副作用）
   */
  async getDiscussionById(id: string): Promise<Discussion | null> {
    const { data, error } = await this.supabase
      .from(DB.discussions)
      .select(`
        *,
        user:${DB.users}!${DB.discussions}_user_id_fkey (id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('获取讨论详情失败', new Error(String(error.message)), {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return null;
    }

    return data as Discussion;
  }

  /**
   * 原子递增讨论浏览量
   */
  async incrementDiscussionViewCount(id: string): Promise<void> {
    await this.supabase.rpc(RPC.increment_discussion_view_count, { p_discussion_id: id });
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
    // 统一验证规则（与 lib/validations/index.ts 保持一致）
    if (data.content.trim().length < 20) {
      return { success: false, error: '内容至少 20 个字' };
    }
    if (data.content.trim().length > 5000) {
      return { success: false, error: '内容不能超过 5000 个字' };
    }
    if (data.title.trim().length < 5) {
      return { success: false, error: '标题至少 5 个字' };
    }
    if (data.title.trim().length > 100) {
      return { success: false, error: '标题不能超过 100 个字' };
    }
    // 确保标题包含有意义的内容（至少 2 个中文字符或 5 个字母字符）
    const titleContent = data.title.trim();
    const hasMeaningfulContent = /[\u4e00-\u9fff]{2,}/.test(titleContent) || /[a-zA-Z]{5,}/.test(titleContent);
    if (!hasMeaningfulContent) {
      return { success: false, error: '标题需包含至少 2 个中文字符或 5 个字母字符' };
    }

    try {
      const { data: discussion, error } = await this.supabase
        .from(DB.discussions)
        .insert({
          user_id: userId,
          title: data.title,
          content: data.content,
          tags: data.tags || null,
        })
        .select(`
          *,
          user:${DB.users}!${DB.discussions}_user_id_fkey (id, name, avatar_url)
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 添加创建者为参与者
      await this.supabase
        .from(DB.discussion_participants)
        .insert({
          user_id: userId,
          discussion_id: discussion.id,
        });

      // 发放积分
      const { data: points } = await this.supabase.rpc(RPC.add_user_points, {
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
   *
   * TOCTOU 修复：不再先 SELECT 检查再 INSERT，
   * 直接调用 add_user_points RPC（内部有 advisory lock + 去重逻辑）
   */
  async checkAndRewardPopularDiscussion(discussionId: string): Promise<void> {
    const { data: discussion } = await this.supabase
      .from(DB.discussions)
      .select('user_id, participant_count')
      .eq('id', discussionId)
      .single();

    if (!discussion || discussion.participant_count < 10) return;

    // 直接调用 RPC — add_user_points 内部通过 advisory lock 保证并发安全
    // 如果已经奖励过（相同 user_id + action_type + reference_id），RPC 会跳过
    await this.supabase.rpc(RPC.add_user_points, {
      p_user_id: discussion.user_id,
      p_points: 100,
      p_action_type: 'POPULAR_DISCUSSION',
      p_reference_id: discussionId,
      p_reference_type: 'discussion',
      p_description: '发起的话题参与人数超过10人',
    });
  }

  /**
   * 获取热门标签（通过 RPC 避免全表扫描）
   */
  async getPopularTags(limit: number = 10): Promise<string[]> {
    const { data, error } = await this.supabase.rpc(RPC.get_popular_tags, { p_limit: limit });
    if (error || !data) {
      if (error) {
        logger.error('获取热门标签失败', new Error(String(error.message)), {
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }
      return [];
    }
    return data.map((row: { tag: string }) => row.tag);
  }
}

/**
 * 创建讨论区服务实例
 */
export function createDiscussionsService(supabase: SupabaseClient): DiscussionsService {
  return new DiscussionsService(supabase);
}
