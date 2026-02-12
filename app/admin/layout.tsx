import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAuthUserWithProfile, isAdmin } from '@/lib/supabase/auth';
import { AdminAuthGuard } from '@/components/auth/admin-auth-guard';
import { AdminAuthErrorBoundary } from '@/components/auth/admin-auth-error-boundary';

// SEO: Prevent search engines from indexing admin pages
export const metadata: Metadata = {
  title: { default: '管理面板', template: '%s | 管理面板' },
  robots: { index: false, follow: false },
};

/**
 * Admin 布局 - Server Layout Guard
 *
 * Next.js 16 最佳实践：认证和授权保护移到 Server Layout 中
 * 使用 ErrorBoundary + Suspense + AdminAuthGuard 确保：
 * - Suspense 处理 pending 状态
 * - ErrorBoundary 捕获 promise rejection（网络错误等）
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUserPromise = getAuthUserWithProfile();
  const isAdminPromise = isAdmin();

  return (
    <AdminAuthErrorBoundary>
      <Suspense fallback={<AdminLoadingShell />}>
        <AdminAuthGuard
          authUserPromise={authUserPromise}
          isAdminPromise={isAdminPromise}
          fallbackUser={null}
        >
          {children}
        </AdminAuthGuard>
      </Suspense>
    </AdminAuthErrorBoundary>
  );
}

function AdminLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-2 text-sm text-muted-foreground">验证权限中...</p>
      </div>
    </div>
  );
}
