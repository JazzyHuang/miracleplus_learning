'use client';

import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { use } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User as UserProfile } from '@/types/database';

interface AuthGuardProps {
  authUserPromise: Promise<{ authUser: SupabaseUser | null; profile: UserProfile | null }>;
  children: ReactNode;
}

/**
 * 认证守卫组件
 *
 * 使用 React 19 的 use() hook 来解包 Promise，实现客户端认证检查。
 * 配合 Suspense 使用，避免在布局中直接 await 导致的 Blocking Route 警告。
 */
export function AuthGuard({ authUserPromise, children }: AuthGuardProps) {
  const { authUser } = use(authUserPromise);

  if (!authUser) {
    redirect('/login');
  }

  return <>{children}</>;
}
