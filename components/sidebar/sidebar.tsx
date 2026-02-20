'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useUser, useUserLoading } from '@/contexts/user-context';
import { useSidebar } from './sidebar-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Skeleton } from '@/components/ui/skeleton';
import { NavSection } from './nav-section';
import { navGroups, allNavItems, findGroupByHref } from './nav-config';

// 检测用户平台用于显示正确的快捷键
function isMac(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

// 性能优化：MobileNav 仅在移动端需要，桌面端不加载
const MobileNav = dynamic(
  () => import('./mobile-nav').then((m) => ({ default: m.MobileNav })),
  { ssr: false }
);

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  ChevronLeft,
  LogIn,
  LogOut,
  Settings,
  Shield,
  Command,
  User,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

// Sidebar transition 已移至 CSS（sidebar-gpu class in globals.css）

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useUser();
  const userLoading = useUserLoading();
  const { collapsed, toggle, expandedSections, toggleSection } = useSidebar();
  const { theme, setTheme } = useTheme();

  // 检测用户平台用于显示正确的快捷键（客户端挂载后设置，避免水合不匹配）
  const [shortcutKey, setShortcutKey] = useState('⌘K');
  useEffect(() => {
    setShortcutKey(isMac() ? '⌘K' : 'Ctrl+K');
  }, []);

  // 性能优化：预取所有导航路由，实现即时导航体验（仅挂载时执行一次）
  useEffect(() => {
    allNavItems.forEach(item => router.prefetch(item.href));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 路由变化时自动展开包含活跃路由的分组
  useEffect(() => {
    const groupId = findGroupByHref(pathname);
    if (groupId && !expandedSections[groupId]) {
      toggleSection(groupId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        style={{ width: collapsed ? 72 : 260 }}
        className="hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 bg-surface-dark/90 backdrop-blur-xl border-r border-surface-dark-border sidebar-gpu transition-[width] duration-250 ease-sidebar"
      >
        {/* Logo Section */}
        <div className="p-4 h-16 flex items-center justify-between border-b border-surface-dark-border group/header">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-theme-sm hover:scale-105 active:scale-95 transition-transform">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-150">
                <span className="font-medium text-sm text-foreground tracking-tight">Miracle</span>
                <span className="text-xs text-foreground/60 tracking-wide">LEARNING</span>
              </div>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {!collapsed && <NotificationBell />}
            <button
              onClick={toggle}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200',
                'text-foreground/40 hover:text-foreground/70 hover:bg-accent',
                collapsed ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'
              )}
              aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <ChevronLeft
                className="w-4 h-4 transition-transform duration-250 ease-sidebar"
                style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
              />
            </button>
          </div>
        </div>

        {/* Search / Command Trigger */}
        {!collapsed && (
          <div className="px-3 pt-3 animate-in fade-in duration-150">
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                document.dispatchEvent(event);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-dark border border-surface-dark-border text-foreground/50 text-sm hover:border-primary/20 hover:text-foreground/70 transition-all duration-200"
            >
              <Command className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">搜索...</span>
              <kbd className="text-xs bg-background px-1.5 py-0.5 rounded border border-surface-dark-border">{shortcutKey}</kbd>
            </button>
          </div>
        )}

        {/* Main Navigation — 分组导航 */}
        <nav aria-label="主导航" className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-hide">
          {navGroups.map((group, index) => (
            <div key={group.id}>
              {/* 收起模式下组间分隔线（第一组不需要） */}
              {collapsed && index > 0 && (
                <div className="my-2 h-px bg-gradient-to-r from-transparent via-surface-dark-border to-transparent" />
              )}
              <NavSection
                group={group}
                collapsed={collapsed}
                expanded={expandedSections[group.id] ?? false}
                onToggle={() => toggleSection(group.id)}
                pathname={pathname}
              />
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-surface-dark-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 w-full p-2 rounded-xl',
                  'hover:bg-accent transition-all duration-200 active:scale-[0.99]'
                )}
              >
                {userLoading && !user ? (
                  <>
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    {!collapsed && (
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-2.5 w-24" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="relative shrink-0">
                      <Avatar className="w-9 h-9 border border-surface-dark-border">
                        <AvatarImage src={user?.avatar_url || ''} />
                        <AvatarFallback className="bg-secondary text-foreground/70 text-sm font-medium">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {user && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-dark" />
                      )}
                    </div>
                    {!collapsed && (
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="font-medium text-sm truncate text-foreground">
                          {user?.name || '未登录'}
                        </p>
                        <p className="text-xs text-foreground/60 truncate">
                          {user?.email || '点击登录账号'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-64">
              {user ? (
                <>
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/profile">
                        <User className="w-4 h-4 mr-2" />
                        个人资料
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        设置
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  {/* 外观切换 */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-2 px-2">外观</p>
                    <div className="flex gap-1 px-1">
                      {([
                        { value: 'light', icon: Sun, label: '浅色' },
                        { value: 'dark', icon: Moon, label: '深色' },
                        { value: 'system', icon: Monitor, label: '系统' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all duration-200',
                            theme === opt.value
                              ? 'bg-accent text-foreground font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          )}
                        >
                          <opt.icon className="w-3.5 h-3.5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {user.role === 'admin' && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/admin">
                          <Shield className="w-4 h-4 mr-2" />
                          管理后台
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <div className="py-1">
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onSelect={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      退出登录
                    </DropdownMenuItem>
                  </div>
                </>
              ) : (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/login">
                    <LogIn className="w-4 h-4 mr-2" />
                    登录
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <MobileNav pathname={pathname} user={user} onSignOut={handleSignOut} />
    </>
  );
}
