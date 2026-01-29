/**
 * AI 工具模块导出
 * 
 * ## 架构说明
 * 
 * ### 客户端安全（可在 'use client' 组件中使用）
 * - `AIToolsService`, `createAIToolsService` - AI 工具服务类
 * 
 * ### 服务端专用（仅限 Server Components / API Routes）
 * - 直接从 '@/lib/ai-tools/queries' 导入
 * 
 * @example
 * // 客户端组件
 * 'use client';
 * import { createAIToolsService } from '@/lib/ai-tools';
 * 
 * // 服务端组件
 * import { getToolCategories, getFeaturedTools } from '@/lib/ai-tools/queries';
 */

// ============================================================
// 客户端安全导出 - 可在 'use client' 组件中使用
// ============================================================

export { AIToolsService, createAIToolsService } from './service';

// ============================================================
// 服务端专用 - 请直接从 '@/lib/ai-tools/queries' 导入
// ============================================================
// 
// 以下函数依赖 `unstable_cache` 和服务端 Supabase 客户端：
// 
// - getToolCategories - 获取工具分类（缓存 5 分钟）
// - getFeaturedTools - 获取精选工具（缓存 5 分钟）
// - getToolsList - 获取工具列表（缓存 3 分钟）
// - getToolById - 获取工具详情（缓存 5 分钟）
// - getWeeklyPicks - 获取本周精选（缓存 1 小时）
// ============================================================
