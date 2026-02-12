'use client';

import dynamic from 'next/dynamic';
import { Sidebar, SidebarProvider, useSidebar } from '@/components/sidebar';
import { SkipLink } from '@/components/ui/skip-link';
import { cn } from '@/lib/utils';

// 性能优化：CommandPalette 仅在 Cmd+K 时使用，动态导入减少首屏 JS
const CommandPalette = dynamic(
  () => import('@/components/ui/command-palette').then(mod => mod.CommandPalette),
  { ssr: false, loading: () => null }
);

/**
 * Dashboard 内容区域
 * 
 * Learn About 风格：
 * - 深海军蓝背景 + 白色内容卡片
 * - 大量留白，聚焦内容
 * - 移除品牌渐变光球（简洁风格）
 */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <>
      {/* Desktop Content */}
      <main
        id="main-content"
        className={cn(
          'hidden lg:block min-h-screen transition-[margin-left] duration-300 ease-out',
          collapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
        role="main"
        aria-label="主要内容"
      >
        {/* Content wrapper — 更大留白 */}
        <div className="relative">
          <div className="max-w-6xl mx-auto px-8 lg:px-12 py-8">{children}</div>
        </div>
      </main>

      {/* Mobile Content */}
      <main 
        id="main-content-mobile" 
        className="lg:hidden pt-14 pb-24 pb-safe min-h-screen"
        role="main"
        aria-label="主要内容"
      >
        <div className="relative px-4 py-4">{children}</div>
      </main>
    </>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * Dashboard Shell — Learn About 风格壳
 * 
 * 深海军蓝背景 + 白色内容卡片
 */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Skip link for keyboard navigation */}
        <SkipLink />
        {/* Command Palette (Cmd+K) */}
        <CommandPalette />
        <Sidebar />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
