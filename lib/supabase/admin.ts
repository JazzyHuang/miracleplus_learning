import { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * 检查用户是否为管理员
 * 
 * 安全说明：
 * 1. 优先检查 app_metadata.role（服务器端设置，用户无法修改）
 * 2. 后备方案：从数据库查询（用于遗留用户）
 * 3. NEVER 使用 user_metadata 进行权限检查（用户可修改）
 * 
 * @param user Supabase 用户对象
 * @param supabase Supabase 客户端（用于数据库查询后备）
 * @returns 是否为管理员
 */
export async function isAdmin(
  user: User | null,
  supabase: SupabaseClient
): Promise<boolean> {
  if (!user) {
    return false;
  }

  // 1. 优先检查 app_metadata（安全，用户无法修改）
  if (user.app_metadata?.role === 'admin') {
    return true;
  }

  // 2. 后备：从数据库查询（用于遗留用户或 app_metadata 未设置的情况）
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch {
    return false;
  }
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

  const adminStatus = await isAdmin(user, supabase);
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

  // 如果用户存在但不是管理员，将在调用方检查后返回
  return null;
}
