/**
 * 管理员权限统一检查模块
 * 
 * 此模块提供统一的管理员权限检查接口，
 * 整合了 lib/supabase/admin.ts 的功能，
 * 并提供更便捷的 API。
 */

import { SupabaseClient, User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { 
  isAdmin as checkIsAdmin, 
  checkAdminAccess as baseCheckAdminAccess 
} from '@/lib/supabase/admin';

/**
 * 自定义错误类型
 */
export class UnauthorizedError extends Error {
  constructor(message = '未登录') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = '无权限访问') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * 管理员权限检查结果
 */
export interface AdminCheckResult {
  user: User;
  supabase: SupabaseClient;
  isAdmin: true;
}

/**
 * 要求管理员权限
 * 
 * 用于 Server Actions 和 API Routes 中，
 * 统一检查管理员权限并返回用户信息。
 * 
 * @param supabase - Supabase 客户端
 * @throws UnauthorizedError - 用户未登录
 * @throws ForbiddenError - 用户无管理员权限
 * @returns 用户信息和 Supabase 客户端
 * 
 * @example
 * ```ts
 * // 在 Server Action 中使用
 * export async function adminAction() {
 *   const supabase = await createClient();
 *   const { user } = await requireAdmin(supabase);
 *   // ... 执行管理员操作
 * }
 * ```
 */
export async function requireAdmin(
  supabase: SupabaseClient
): Promise<AdminCheckResult> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new UnauthorizedError();
  }
  
  const isAdmin = await checkIsAdmin(user, supabase);
  
  if (!isAdmin) {
    throw new ForbiddenError();
  }
  
  return { user, supabase, isAdmin: true };
}

/**
 * 检查管理员权限（不抛出异常）
 * 
 * 用于需要软检查的场景，返回检查结果而不抛出异常。
 * 
 * @param supabase - Supabase 客户端
 * @returns { isAdmin: boolean, user: User | null }
 */
export async function checkAdminAccess(
  supabase: SupabaseClient
): Promise<{ isAdmin: boolean; user: User | null }> {
  return baseCheckAdminAccess(supabase);
}

/**
 * 保护管理员页面
 * 
 * 用于 Server Components 中保护管理员页面，
 * 如果用户未登录或无权限，自动重定向。
 * 
 * @param supabase - Supabase 客户端
 * @param redirectTo - 无权限时重定向的路径，默认为 '/'
 * @returns 用户信息
 * 
 * @example
 * ```ts
 * // 在管理员页面的 Server Component 中使用
 * export default async function AdminPage() {
 *   const supabase = await createClient();
 *   const { user } = await protectAdminPage(supabase);
 *   // ... 渲染管理员页面
 * }
 * ```
 */
export async function protectAdminPage(
  supabase: SupabaseClient,
  redirectTo: string = '/'
): Promise<{ user: User }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const isAdmin = await checkIsAdmin(user, supabase);
  
  if (!isAdmin) {
    redirect(redirectTo);
  }
  
  return { user };
}

/**
 * 创建管理员 API 响应
 * 
 * 用于 API Routes 中快速创建权限错误响应。
 */
export function createAdminErrorResponse(
  error: Error
): Response {
  if (error instanceof UnauthorizedError) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  if (error instanceof ForbiddenError) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // 其他错误
  return new Response(
    JSON.stringify({ success: false, error: '服务器错误' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

// 导出原有的函数以保持兼容性
export { checkIsAdmin as isAdmin };
