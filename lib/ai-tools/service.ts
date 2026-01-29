/**
 * AI 工具服务
 * 
 * 提供 AI 工具相关的业务逻辑，包括：
 * - 工具列表与详情
 * - 工具评分
 * - 灵感碎片
 * - 应用案例
 * - 工具对比
 * - 用户收藏
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  AITool,
  ToolCategory,
  ToolExperience,
  ToolCase,
  WeeklyPick,
} from '@/types/database';

/**
 * AI 工具服务类
 */
export class AIToolsService {
  constructor(private supabase: SupabaseClient) {}

  // ==================== 分类相关 ====================

  /**
   * 获取所有工具分类
   */
  async getCategories(): Promise<ToolCategory[]> {
    const { data, error } = await this.supabase
      .from('tool_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('获取工具分类失败:', error);
      return [];
    }

    return data as ToolCategory[];
  }

  // ==================== 工具相关 ====================

  /**
   * 获取工具列表
   */
  async getTools(options: {
    categoryId?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ tools: AITool[]; total: number }> {
    const { categoryId, featured, search, limit = 20, offset = 0 } = options;

    let query = this.supabase
      .from('ai_tools')
      .select('*, category:tool_categories(*)', { count: 'exact' })
      .eq('is_active', true);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (featured) {
      query = query.eq('is_featured', true);
    }

    if (search) {
      // 转义特殊字符防止 PostgREST 查询注入
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.or(`name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
    }

    query = query
      .order('is_featured', { ascending: false })
      .order('avg_rating', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('获取工具列表失败:', error);
      return { tools: [], total: 0 };
    }

    return {
      tools: data as AITool[],
      total: count || 0,
    };
  }

  /**
   * 获取单个工具详情
   */
  async getToolById(toolId: string): Promise<AITool | null> {
    const { data, error } = await this.supabase
      .from('ai_tools')
      .select('*, category:tool_categories(*)')
      .eq('id', toolId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('获取工具详情失败:', error);
      return null;
    }

    return data as AITool;
  }

  /**
   * 根据 slug 获取工具
   */
  async getToolBySlug(slug: string): Promise<AITool | null> {
    const { data, error } = await this.supabase
      .from('ai_tools')
      .select('*, category:tool_categories(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('获取工具详情失败:', error);
      return null;
    }

    return data as AITool;
  }

  // ==================== 评分相关 ====================

  /**
   * 获取用户对工具的评分
   */
  async getUserRating(userId: string, toolId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('tool_ratings')
      .select('rating')
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .single();

    if (error) return null;
    return data?.rating || null;
  }

  /**
   * 提交工具评分
   */
  async submitRating(
    userId: string,
    toolId: string,
    rating: number
  ): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    if (rating < 1 || rating > 5) {
      return { success: false, error: '评分必须在 1-5 之间' };
    }

    try {
      // 使用 upsert 来创建或更新评分
      const { error } = await this.supabase
        .from('tool_ratings')
        .upsert({
          user_id: userId,
          tool_id: toolId,
          rating,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // 发放积分（首次评分）
      const { data: points } = await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: 5,
        p_action_type: 'TOOL_RATING',
        p_reference_id: toolId,
        p_reference_type: 'ai_tool',
        p_description: '工具评分',
      });

      return { success: true, pointsEarned: points || 0 };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
    }
  }

  // ==================== 灵感碎片相关 ====================

  /**
   * 获取工具的灵感碎片
   */
  async getExperiences(
    toolId: string,
    limit: number = 20
  ): Promise<ToolExperience[]> {
    const { data, error } = await this.supabase
      .from('tool_experiences')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `)
      .eq('tool_id', toolId)
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取灵感碎片失败:', error);
      return [];
    }

    return data as ToolExperience[];
  }

  /**
   * 提交灵感碎片
   */
  async submitExperience(
    userId: string,
    toolId: string,
    data: {
      use_case: string;
      pros?: string;
      cons?: string;
      screenshot_url: string;
    }
  ): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    if (!data.screenshot_url) {
      return { success: false, error: '请上传截图' };
    }

    try {
      const { error } = await this.supabase
        .from('tool_experiences')
        .insert({
          user_id: userId,
          tool_id: toolId,
          use_case: data.use_case,
          pros: data.pros || null,
          cons: data.cons || null,
          screenshot_url: data.screenshot_url,
          status: 'approved', // 灵感碎片默认不需要审核
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // 发放积分
      const { data: points } = await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: 30,
        p_action_type: 'TOOL_EXPERIENCE',
        p_reference_id: toolId,
        p_reference_type: 'ai_tool',
        p_description: '发布灵感碎片',
      });

      return { success: true, pointsEarned: points || 0 };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
    }
  }

  // ==================== 应用案例相关 ====================

  /**
   * 获取工具的应用案例
   */
  async getCases(
    toolId?: string,
    options: { limit?: number; featured?: boolean } = {}
  ): Promise<ToolCase[]> {
    const { limit = 20, featured } = options;

    let query = this.supabase
      .from('tool_cases')
      .select(`
        *,
        user:users (id, name, email, avatar_url),
        tool:ai_tools (id, name, slug, logo_url)
      `)
      .in('status', ['approved', 'featured'])
      .order('is_featured', { ascending: false })
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (toolId) {
      query = query.eq('tool_id', toolId);
    }

    if (featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取应用案例失败:', error);
      return [];
    }

    return data as ToolCase[];
  }

  /**
   * 提交应用案例
   */
  async submitCase(
    userId: string,
    toolId: string,
    data: {
      title: string;
      problem_background: string;
      solution: string;
      result?: string;
      images?: string[];
      tags?: string[];
    }
  ): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('tool_cases')
        .insert({
          user_id: userId,
          tool_id: toolId,
          title: data.title,
          problem_background: data.problem_background,
          solution: data.solution,
          result: data.result || null,
          images: data.images || null,
          tags: data.tags || null,
          status: 'pending', // 案例需要审核
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // 发放积分
      const { data: points } = await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: 120,
        p_action_type: 'TOOL_CASE',
        p_reference_id: toolId,
        p_reference_type: 'ai_tool',
        p_description: '发布应用案例',
      });

      return { success: true, pointsEarned: points || 0 };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
    }
  }

  // ==================== 收藏相关 ====================

  /**
   * 检查用户是否已收藏
   */
  async isBookmarked(
    userId: string,
    targetType: 'tool' | 'case' | 'comparison',
    targetId: string
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_bookmarks')
      .select('user_id')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single();

    return !!data;
  }

  /**
   * 切换收藏状态
   */
  async toggleBookmark(
    userId: string,
    targetType: 'tool' | 'case' | 'comparison',
    targetId: string
  ): Promise<{ bookmarked: boolean; error?: string }> {
    const isCurrentlyBookmarked = await this.isBookmarked(userId, targetType, targetId);

    try {
      if (isCurrentlyBookmarked) {
        // 取消收藏
        const { error } = await this.supabase
          .from('user_bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetId);

        if (error) throw error;
        return { bookmarked: false };
      } else {
        // 添加收藏
        const { error } = await this.supabase
          .from('user_bookmarks')
          .insert({
            user_id: userId,
            target_type: targetType,
            target_id: targetId,
          });

        if (error) throw error;
        return { bookmarked: true };
      }
    } catch (err) {
      return {
        bookmarked: isCurrentlyBookmarked,
        error: err instanceof Error ? err.message : '操作失败',
      };
    }
  }

  /**
   * 获取用户收藏的工具
   */
  async getUserBookmarkedTools(userId: string): Promise<AITool[]> {
    const { data, error } = await this.supabase
      .from('user_bookmarks')
      .select(`
        target_id,
        ai_tools:target_id (*, category:tool_categories(*))
      `)
      .eq('user_id', userId)
      .eq('target_type', 'tool');

    if (error) {
      console.error('获取收藏工具失败:', error);
      return [];
    }

    return ((data || []) as unknown as Array<{ ai_tools: AITool | null }>)
      .map((d) => d.ai_tools)
      .filter((t): t is AITool => t !== null && typeof t === 'object');
  }

  // ==================== 每周推荐相关 ====================

  /**
   * 获取本周推荐
   */
  async getWeeklyPicks(): Promise<WeeklyPick[]> {
    // 获取本周一的日期
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const weekStart = monday.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('weekly_picks')
      .select(`
        *,
        tool:ai_tools (*, category:tool_categories(*))
      `)
      .eq('week_start', weekStart)
      .order('vote_count', { ascending: false });

    if (error) {
      console.error('获取每周推荐失败:', error);
      return [];
    }

    return data as WeeklyPick[];
  }

  /**
   * 获取热门工具
   */
  async getPopularTools(limit: number = 6): Promise<AITool[]> {
    const { data, error } = await this.supabase
      .from('ai_tools')
      .select('*, category:tool_categories(*)')
      .eq('is_active', true)
      .order('experience_count', { ascending: false })
      .order('avg_rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取热门工具失败:', error);
      return [];
    }

    return data as AITool[];
  }
}

/**
 * 创建 AI 工具服务实例
 */
export function createAIToolsService(supabase: SupabaseClient): AIToolsService {
  return new AIToolsService(supabase);
}
