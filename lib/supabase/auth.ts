import { cache } from 'react';
import { createClient } from './server';
import type { User } from '@/types/database';
import type { User as AuthUser } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { DB } from '@/lib/db-tables';

/**
 * SECURE: Get authenticated user with full server-side validation.
 * Makes a network request to Supabase Auth server to verify the token.
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
    .from(DB.users)
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
      logger.info('用户 profile 已存在（并发创建），重新查询...', { userId: authUser.id });
      const { data: existingProfile } = await supabase
        .from(DB.users)
        .select('*')
        .eq('id', authUser.id)
        .single();
      return existingProfile;
    }
    
    logger.error('创建用户 profile 失败', new Error(error.message), {
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId: authUser.id,
    });
    return null;
  }

  logger.info('用户 profile 创建成功', { userId: authUser.id });
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
    .from(DB.users)
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  
  if (error) {
    // 打印完整的错误信息，便于调试
    logger.error('获取用户 profile 失败', new Error(error.message), {
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId: authUser.id,
    });
    return null;
  }
  
  // 如果 profile 不存在，自动创建一个
  if (!profile) {
    logger.info('用户 profile 不存在，正在创建...', { userId: authUser.id });
    return createUserProfile(authUser);
  }
  
  return profile;
}

/**
 * 安全获取 auth user + profile。
 * 
 * 安全修复：不再使用并行查询 + RLS 依赖模式。
 * 旧模式 `.limit(1).maybeSingle()` 未用 `.eq('id', authUser.id)` 过滤，
 * 若 RLS 允许查看他人 profile（社区平台常见），可能返回错误用户数据。
 * 
 * 现在先验证 auth user，再用 authUser.id 显式过滤查询 profile。
 * React cache() 确保同一请求内只执行一次。
 */
export const getAuthUserWithProfile = cache(async (): Promise<{ authUser: AuthUser | null; profile: User | null }> => {
  const supabase = await createClient();
  
  // Step 1: 验证 auth user
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { authUser: null, profile: null };
  
  // Step 2: 使用 authUser.id 显式过滤查询 profile
  const { data: profile, error } = await supabase
    .from(DB.users)
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  
  if (error) {
    logger.error('获取用户 profile 失败', new Error(error.message), { code: error.code, userId: authUser.id });
  }
  
  // 如果 profile 不存在（新用户），自动创建
  if (!profile) {
    logger.info('用户 profile 不存在，正在创建...', { userId: authUser.id });
    const newProfile = await createUserProfile(authUser);
    return { authUser, profile: newProfile };
  }
  
  return { authUser, profile };
});

/**
 * Check if the current user is an admin.
 * 安全修复：只信任 app_metadata（服务器设置，用户无法修改）
 * user_metadata 可被用户修改，不应用于权限检查
 * 
 * 性能优化：复用 getAuthUserWithProfile() 的缓存结果，避免额外网络请求
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  const { authUser } = await getAuthUserWithProfile();
  if (!authUser) return false;

  // 只检查 app_metadata（服务器设置，用户无法修改）
  // 不再回退到 profile.role，因为该字段可能被用户通过 RLS 修改
  return authUser.app_metadata?.role === 'admin';
});
