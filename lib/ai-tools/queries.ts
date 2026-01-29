/**
 * AI 工具缓存查询
 * 
 * 使用 unstable_cache 包装常用查询，减少数据库请求
 */

import { unstable_cache } from 'next/cache';
import { createCacheClient } from '@/lib/supabase/server';
import type { AITool, ToolCategory } from '@/types/database';

/**
 * 获取所有工具分类（带缓存）
 * 缓存时间：5 分钟
 */
export const getToolCategories = unstable_cache(
  async (): Promise<ToolCategory[]> => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from('tool_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('获取工具分类失败:', error);
      return [];
    }

    return data as ToolCategory[];
  },
  ['ai-tool-categories'],
  { revalidate: 300, tags: ['ai-tools'] }
);

/**
 * 获取精选工具（带缓存）
 * 缓存时间：5 分钟
 */
export const getFeaturedTools = unstable_cache(
  async (limit: number = 6): Promise<AITool[]> => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from('ai_tools')
      .select('*, category:tool_categories(*)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('avg_rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取精选工具失败:', error);
      return [];
    }

    return data as AITool[];
  },
  ['ai-tools-featured'],
  { revalidate: 300, tags: ['ai-tools'] }
);

/**
 * 获取工具列表（带缓存）
 * 缓存时间：3 分钟
 */
export const getToolsList = unstable_cache(
  async (options: {
    categoryId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ tools: AITool[]; total: number }> => {
    const { categoryId, limit = 20, offset = 0 } = options;
    const supabase = createCacheClient();

    let query = supabase
      .from('ai_tools')
      .select('*, category:tool_categories(*)', { count: 'exact' })
      .eq('is_active', true);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
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
  },
  ['ai-tools-list'],
  { revalidate: 180, tags: ['ai-tools'] }
);

/**
 * 获取单个工具详情（带缓存）
 * 缓存时间：5 分钟
 */
export const getToolById = unstable_cache(
  async (toolId: string): Promise<AITool | null> => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from('ai_tools')
      .select('*, category:tool_categories(*)')
      .eq('id', toolId)
      .single();

    if (error) {
      console.error('获取工具详情失败:', error);
      return null;
    }

    return data as AITool;
  },
  ['ai-tool-detail'],
  { revalidate: 300, tags: ['ai-tools'] }
);

/**
 * 获取本周精选（带缓存）
 * 缓存时间：1 小时
 */
export const getWeeklyPicks = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    
    // 获取当前周的开始日期
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('weekly_picks')
      .select('*, tool:ai_tools(*, category:tool_categories(*))')
      .gte('week_start', startOfWeek.toISOString())
      .order('pick_order');

    if (error) {
      console.error('获取本周精选失败:', error);
      return [];
    }

    return data;
  },
  ['ai-tools-weekly-picks'],
  { revalidate: 3600, tags: ['ai-tools', 'weekly-picks'] }
);
