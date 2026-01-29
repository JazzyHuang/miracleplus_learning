/**
 * 课程模块导出
 * 
 * ## 架构说明
 * 
 * ### 客户端安全（可在 'use client' 组件中使用）
 * - `CoursesService`, `createCoursesService` - 课程服务类
 * 
 * ### 服务端专用（仅限 Server Components / Server Actions）
 * - 直接从 '@/lib/courses/actions' 导入
 * 
 * @example
 * // 客户端组件
 * 'use client';
 * import { createCoursesService } from '@/lib/courses';
 * 
 * // Server Action
 * import { markLessonCompleteAction } from '@/lib/courses/actions';
 */

// ============================================================
// 客户端安全导出 - 可在 'use client' 组件中使用
// ============================================================

export * from './service';

// ============================================================
// 服务端专用 - 请直接从 '@/lib/courses/actions' 导入
// ============================================================
// 
// - markLessonCompleteAction - 标记课时完成（Server Action）
// ============================================================
