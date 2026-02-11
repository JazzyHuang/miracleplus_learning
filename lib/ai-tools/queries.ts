/**
 * AI 工具缓存查询
 * 
 * 使用 'use cache' + cacheTag + cacheLife 实现服务端缓存
 */

import { cacheTag, cacheLife } from 'next/cache';
import { createCacheClient } from '@/lib/supabase/server';
import type { AITool, ToolCategory } from '@/types/database';
import { logger } from '@/lib/logger';
import { DB } from '@/lib/db-tables';

/**
 * 获取所有工具分类（带缓存）
 * 缓存时间：5 分钟 (aiTools profile)
 */
export async function getToolCategories(): Promise<ToolCategory[]> {
  'use cache';
  cacheLife('aiTools');
  cacheTag('ai-tools');

  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.tool_categories)
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (error) {
    logger.error('获取工具分类失败:', error);
    return [];
  }

  return data as ToolCategory[];
}

/**
 * 获取精选工具（带缓存）
 * 缓存时间：5 分钟 (aiTools profile)
 * limit 自动成为缓存键的一部分
 */
export async function getFeaturedTools(limit: number = 6): Promise<AITool[]> {
  'use cache';
  cacheLife('aiTools');
  cacheTag('ai-tools');

  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.ai_tools)
    .select(`*, category:${DB.tool_categories}(*)`)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('avg_rating', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('获取精选工具失败:', error);
    return [];
  }

  return data as AITool[];
}

/**
 * 获取工具列表（带缓存）
 * 缓存时间：3 分钟 (aiTools profile)
 * 所有参数自动成为缓存键的一部分
 */
export async function getToolsList(options: {
  categoryId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ tools: AITool[]; total: number }> {
  'use cache';
  cacheLife('aiTools');
  cacheTag('ai-tools');

  const { categoryId, limit = 20, offset = 0 } = options;
  const supabase = createCacheClient();

  let query = supabase
    .from(DB.ai_tools)
    .select(`*, category:${DB.tool_categories}(*)`, { count: 'exact' })
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
    logger.error('获取工具列表失败:', error);
    return { tools: [], total: 0 };
  }

  return {
    tools: data as AITool[],
    total: count || 0,
  };
}

/**
 * 获取单个工具详情（带缓存）
 * 缓存时间：5 分钟 (aiTools profile)
 * toolId 自动成为缓存键的一部分
 */
export async function getToolById(toolId: string): Promise<AITool | null> {
  'use cache';
  cacheLife('aiTools');
  cacheTag('ai-tools', `ai-tool-${toolId}`);

  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.ai_tools)
    .select(`*, category:${DB.tool_categories}(*)`)
    .eq('id', toolId)
    .single();

  if (error) {
    logger.error('获取工具详情失败:', error);
    return null;
  }

  return data as AITool;
}

/**
 * 根据 slug 获取工具详情（带缓存）
 * 缓存时间：5 分钟 (aiTools profile)
 * slug 自动成为缓存键的一部分
 */
export async function getToolBySlug(slug: string): Promise<AITool | null> {
  'use cache';
  cacheLife('aiTools');
  cacheTag('ai-tools', `ai-tool-slug-${slug}`);

  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.ai_tools)
    .select(`*, category:${DB.tool_categories}(*)`)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    logger.error('获取工具详情失败 (slug):', error);
    return null;
  }

  return data as AITool;
}

/**
 * 获取本周精选（带缓存）
 * 缓存时间：1 小时 (weekly profile)
 */
export async function getWeeklyPicks() {
  'use cache';
  cacheLife('weekly');
  cacheTag('ai-tools', 'weekly-picks');

  const supabase = createCacheClient();
  
  // 获取当前周的开始日期
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from(DB.weekly_picks)
    .select(`*, tool:${DB.ai_tools}(*, category:${DB.tool_categories}(*))`)
    .gte('week_start', startOfWeek.toISOString())
    .order('created_at');

  if (error) {
    logger.error('获取本周精选失败:', error);
    return [];
  }

  return data;
}
