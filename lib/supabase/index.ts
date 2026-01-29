/**
 * Supabase 客户端模块导出
 * 
 * ## 架构说明
 * 
 * 此模块按运行环境分离导出：
 * 
 * ### 客户端安全（可在 'use client' 组件中使用）
 * - `createClient` - 浏览器 Supabase 客户端
 * - `uploadImage`, `deleteImage` - 存储操作
 * - `isAdmin`, `checkAdminAccess` - 管理员检查（需传入 supabase 实例）
 * 
 * ### 服务端专用（仅限 Server Components / API Routes / Server Actions）
 * - 直接从 '@/lib/supabase/server' 导入
 * - 直接从 '@/lib/supabase/auth' 导入
 * - 直接从 '@/lib/supabase/queries' 导入
 * 
 * @example
 * // 客户端组件
 * 'use client';
 * import { createClient } from '@/lib/supabase';
 * 
 * // 服务端组件
 * import { createClient } from '@/lib/supabase/server';
 * import { getAuthUser } from '@/lib/supabase/auth';
 * import { getCourses } from '@/lib/supabase/queries';
 */

// ============================================================
// 客户端安全导出 - 可在 'use client' 组件中使用
// ============================================================

/** 浏览器 Supabase 客户端 */
export { createClient } from './client';

/** 存储操作（图片上传/删除） */
export { uploadImage, deleteImage } from './storage';

/** 管理员权限检查（需传入 supabase 实例） */
export { isAdmin, checkAdminAccess, adminOnlyResponse } from './admin';

// ============================================================
// 服务端专用 - 请直接从对应文件导入
// ============================================================
// 
// 以下模块依赖 `next/headers` 或 `next/cache`，不能从此处导出：
// 
// - @/lib/supabase/server
//   - createClient (服务端) - 需要 cookies
//   - createCacheClient - 用于 unstable_cache
// 
// - @/lib/supabase/auth
//   - getSessionUser - 快速获取会话用户
//   - getAuthUser - 安全获取认证用户
//   - getUserProfile - 获取用户资料
//   - getUserProfileByAuthUser - 通过认证用户获取资料
//   - isAdmin (缓存版) - 检查是否管理员
// 
// - @/lib/supabase/queries
//   - getCourses, getCourseById - 课程查询
//   - getWorkshops, getWorkshopById - 活动查询
//   - getLessonById - 课时查询
//   - getUserLearningStats - 用户学习统计
//   - getAdminStats, getAdminCourses - 管理后台数据
// ============================================================
