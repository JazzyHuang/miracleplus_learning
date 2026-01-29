/**
 * 社区功能模块导出
 * 
 * ## 架构说明
 * 
 * 所有导出均为客户端安全，可在任何环境使用。
 * 服务类需要传入 Supabase 客户端实例。
 * 
 * ### 讨论
 * - `DiscussionsService`, `createDiscussionsService` - 讨论服务类
 * 
 * ### 邀请
 * - `InvitationsService`, `createInvitationsService` - 邀请服务类
 * 
 * @example
 * // 客户端组件
 * 'use client';
 * import { createClient } from '@/lib/supabase';
 * import { createDiscussionsService } from '@/lib/community';
 * 
 * const supabase = createClient();
 * const discussionsService = createDiscussionsService(supabase);
 */

// ============================================================
// 客户端安全导出 - 可在任何环境使用
// ============================================================

export { DiscussionsService, createDiscussionsService } from './discussions';
export { InvitationsService, createInvitationsService } from './invitations';
