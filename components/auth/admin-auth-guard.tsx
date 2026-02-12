'use client';

import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { use } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User as UserProfile } from '@/types/database';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

interface AdminAuthGuardProps {
  authUserPromise: Promise<{ authUser: SupabaseUser | null; profile: UserProfile | null }>;
  isAdminPromise: Promise<boolean>;
  children: ReactNode;
  fallbackUser: UserProfile | null;
}

/**
 * 管理员认证守卫组件
 *
 * 使用 React 19 的 use() hook 来解包 Promise，实现客户端认证和授权检查。
 * 配合 Suspense 使用，避免在布局中直接 await 导致的 Blocking Route 警告。
 */
export function AdminAuthGuard({
  authUserPromise,
  isAdminPromise,
  children,
  fallbackUser,
}: AdminAuthGuardProps) {
  const { authUser, profile: user } = use(authUserPromise);
  const hasAdminAccess = use(isAdminPromise);

  if (!authUser) {
    redirect('/login');
  }

  if (!hasAdminAccess) {
    redirect('/');
  }

  return <AdminLayoutShell user={user ?? fallbackUser}>{children}</AdminLayoutShell>;
}
