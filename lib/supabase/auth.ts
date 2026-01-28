import { cache } from 'react';
import { createClient } from './server';
import type { User } from '@/types/database';
import type { User as AuthUser } from '@supabase/supabase-js';

/**
 * FAST: Get auth user from session (local JWT parsing, no network request).
 * Use this for read-only operations like displaying user info in layouts.
 * 
 * Note: This trusts the JWT signature. For sensitive operations (mutations,
 * payments, role checks), use getAuthUser() which validates with Supabase server.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
});

/**
 * SECURE: Get authenticated user with full server-side validation.
 * Makes a network request to Supabase Auth server to verify the token.
 * Use this for sensitive operations that require guaranteed authenticity.
 * 
 * React's cache() ensures this is only called once per request,
 * even if called from multiple components.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * 为 auth user 创建 profile 记录
 * 此函数仅在 profile 不存在时调用
 * 
 * @param authUser - 已通过 getAuthUser() 验证的用户
 */
async function createUserProfile(authUser: AuthUser): Promise<User | null> {
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email ?? '',
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      avatar_url: authUser.user_metadata?.avatar_url || null,
      role: 'user' as const,
    })
    .select('*')
    .single();

  if (error) {
    // 如果是唯一约束冲突（23505），说明记录已存在（可能由并发请求创建）
    // 尝试重新查询获取已存在的记录
    if (error.code === '23505') {
      console.log('用户 profile 已存在（并发创建），重新查询...', { userId: authUser.id });
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      return existingProfile;
    }
    
    console.error('创建用户 profile 失败:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId: authUser.id,
    });
    return null;
  }

  console.log('用户 profile 创建成功', { userId: authUser.id });
  return profile;
}

/**
 * Get user's profile from database using a verified auth user.
 * 使用已验证的 auth user 直接查询 profile，确保 RLS context 一致
 * 如果 profile 不存在，会自动创建一个
 * 
 * @param authUser - 已通过 getAuthUser() 验证的用户
 */
export async function getUserProfileByAuthUser(authUser: AuthUser): Promise<User | null> {
  const supabase = await createClient();
  
  // 使用 maybeSingle() 而不是 single()，避免没有记录时报错
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  
  if (error) {
    // 打印完整的错误信息，便于调试
    console.error('获取用户 profile 失败:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId: authUser.id,
    });
    return null;
  }
  
  // 如果 profile 不存在，自动创建一个
  if (!profile) {
    console.log('用户 profile 不存在，正在创建...', { userId: authUser.id });
    return createUserProfile(authUser);
  }
  
  return profile;
}

/**
 * Get user's profile from database.
 * 现在默认使用安全模式 (getAuthUser)，确保 RLS 正确工作
 * 
 * @param secure - If true, uses getAuthUser() for full validation (default: true)
 * @deprecated 推荐使用 getUserProfileByAuthUser() 或直接在 layout 中获取
 */
export const getUserProfile = cache(async (secure = true): Promise<User | null> => {
  const user = secure ? await getAuthUser() : await getSessionUser();
  if (!user) return null;
  
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('获取用户 profile 失败:', error);
    return null;
  }
  
  return profile;
});

/**
 * Check if the current user is an admin.
 * 安全修复：只信任 app_metadata（服务器设置，用户无法修改）
 * user_metadata 可被用户修改，不应用于权限检查
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  const user = await getAuthUser();
  if (!user) return false;
  
  // 只检查 app_metadata（服务器设置，用户无法修改）
  // 不检查 user_metadata，因为用户可以修改它
  if (user.app_metadata?.role === 'admin') return true;
  
  // 后备：从数据库查询
  const profile = await getUserProfile(true);
  return profile?.role === 'admin';
});
