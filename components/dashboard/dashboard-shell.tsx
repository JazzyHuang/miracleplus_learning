'use client';

import { Sidebar, SidebarProvider, useSidebar } from '@/components/sidebar';
import { UserProvider } from '@/contexts/user-context';
import { SkipLink } from '@/components/ui/skip-link';
import { cn } from '@/lib/utils';
import type { User } from '@/types/database';

/**
 * Dashboard 内容区域
 * 
 * Phase 5 改进：使用 CSS transition + margin-left 替代 framer-motion 的 paddingLeft
 * 这样更高效，避免不必要的 JS 动画
 */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <>
      {/* Desktop Content - 使用 CSS transition */}
      <main
        id="main-content"
        className={cn(
          'hidden lg:block min-h-screen transition-[margin-left] duration-200 ease-out',
          collapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
        role="main"
        aria-label="主要内容"
      >
        <div className="p-6 lg:p-10">{children}</div>
      </main>

      {/* Mobile Content */}
      <main 
        id="main-content-mobile" 
        className="lg:hidden pt-14 pb-16 min-h-screen"
        role="main"
        aria-label="主要内容"
      >
        <div className="p-6">{children}</div>
      </main>
    </>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: User | null;
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <UserProvider initialUser={user}>
      <SidebarProvider>
        <div className="min-h-screen bg-background">
          {/* 跳过链接 - 用于键盘导航 */}
          <SkipLink />
          <Sidebar />
          <DashboardContent>{children}</DashboardContent>
        </div>
      </SidebarProvider>
    </UserProvider>
  );
}
