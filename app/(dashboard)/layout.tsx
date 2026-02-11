import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { DashboardShell } from '@/components/dashboard';
import { PageTransition } from '@/components/page-transition';
import { OfflineIndicator } from '@/components/pwa';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Skeleton } from '@/components/ui/skeleton';

// 性能优化：非关键组件懒加载，减少 dashboard 初始 JS 体积
const WelcomeFlow = dynamic(
  () => import('@/components/onboarding/welcome-flow').then((m) => ({ default: m.WelcomeFlow }))
);
const ProfileCompletionBanner = dynamic(
  () => import('@/components/onboarding/welcome-flow').then((m) => ({ default: m.ProfileCompletionBanner }))
);
const NotificationProvider = dynamic(
  () => import('@/components/notifications/notification-provider').then((m) => ({ default: m.NotificationProvider }))
);

/**
 * Dashboard 布局 - Server Layout Guard
 *
 * Next.js 16 最佳实践：认证保护移到 Server Layout 中
 * 使用 Suspense + AuthGuard 避免 Blocking Route 警告
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 预先创建 Promise，在 Suspense 中使用
  const authUserPromise = getAuthUserWithProfile();

  return (
    <Suspense fallback={<DashboardLoadingShell />}>
      <AuthGuard authUserPromise={authUserPromise}>
        <DashboardShell>
          <OfflineIndicator />
          <NotificationProvider>
            <WelcomeFlow />
            <ProfileCompletionBanner />
            <PageTransition>{children}</PageTransition>
          </NotificationProvider>
        </DashboardShell>
      </AuthGuard>
    </Suspense>
  );
}

/**
 * Dashboard 布局骨架 — 匹配 DashboardShell 实际布局
 * 左侧 sidebar 骨架 + 右侧内容区骨架，消除布局跳动 (CLS)
 */
function DashboardLoadingShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop: Sidebar + Content */}
      <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 w-[260px] bg-surface-dark/90 border-r border-surface-dark-border">
        {/* Logo */}
        <div className="p-4 h-16 flex items-center border-b border-surface-dark-border gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        {/* Search */}
        <div className="px-3 pt-3">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          <Skeleton className="h-3 w-8 mb-2 ml-3" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="w-[18px] h-[18px] rounded" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
          <div className="my-4 h-px bg-surface-dark-border" />
          <Skeleton className="h-3 w-8 mb-2 ml-3" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="w-[18px] h-[18px] rounded" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </nav>
        {/* User section */}
        <div className="p-3 border-t border-surface-dark-border">
          <div className="flex items-center gap-3 p-2.5">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop content area */}
      <main className="hidden lg:block ml-[260px] min-h-screen">
        <div className="max-w-6xl mx-auto px-8 lg:px-12 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </main>

      {/* Mobile: content only (no sidebar) */}
      <main className="lg:hidden pt-14 pb-20 min-h-screen">
        <div className="px-4 py-4 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
