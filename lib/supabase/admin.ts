import { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * 检查用户是否为管理员
 *
 * 安全说明：
 * - 只检查 app_metadata.role（服务器端设置，用户无法修改）
 * - NEVER 使用 user_metadata 进行权限检查（用户可修改）
 * - NEVER 从数据库查询 role（可能被篡改）
 *
 * 为什么移除数据库回退？
 * 1. app_metadata 是 Supabase Auth 服务器端管理的，用户无法修改
 * 2. 数据库 role 字段可能被有权限的用户直接修改
 * 3. 统一使用 app_metadata 简化权限模型
 * 4. 如果用户没有 app_metadata.role，说明不是管理员
 *
 * 迁移说明：
 * - 运行 scripts/audit-admin-roles.ts 确保 adminMetadata.role 已设置
 * - 设置后可以安全移除数据库回退逻辑
 *
 * @param user Supabase 用户对象
 * @returns 是否为管理员
 */
export function isAdmin(user: User | null): boolean {
  if (!user) {
    return false;
  }

  // 只检查 app_metadata（安全，用户无法修改）
  return user.app_metadata?.role === 'admin';
}

/**
 * 检查当前请求用户是否为管理员
 * 便捷方法，自动获取用户并检查权限
 *
 * @param supabase Supabase 服务端客户端
 * @returns { isAdmin: boolean, user: User | null }
 */
export async function checkAdminAccess(
  supabase: SupabaseClient
): Promise<{ isAdmin: boolean; user: User | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, user: null };
  }

  // 使用简化的 isAdmin 函数（不需要传递 supabase）
  const adminStatus = isAdmin(user);
  return { isAdmin: adminStatus, user };
}

/**
 * 要求管理员权限的装饰器响应
 * 用于 API 路由中快速返回 401/403 响应
 */
export function adminOnlyResponse(user: User | null): Response | null {
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: '未登录' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 检查管理员权限
  if (!isAdmin(user)) {
    return new Response(
      JSON.stringify({ success: false, error: '无权访问' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}

/**
 * 获取用户角色
 * 返回用户的角色（admin 或 user）
 */
export function getUserRole(user: User | null): 'admin' | 'user' | null {
  if (!user) {
    return null;
  }

  return user.app_metadata?.role === 'admin' ? 'admin' : 'user';
}

