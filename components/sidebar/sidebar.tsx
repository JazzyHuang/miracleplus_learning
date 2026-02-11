'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser, useUserLoading } from '@/contexts/user-context';
import { useSidebar } from './sidebar-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';

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
  CalendarDays,
  BookOpen,
  ChevronLeft,
  LogIn,
  LogOut,
  Settings,
  Shield,
  Home,
  Bot,
  MessageSquare,
  Trophy,
  User,
  Command,
  UserPlus,
  ShoppingBag,
  Newspaper,
} from 'lucide-react';

const navItems = [
  {
    label: '首页',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: '课程资源',
    href: '/courses',
    icon: BookOpen,
  },
  {
    label: 'Workshop',
    href: '/workshop',
    icon: CalendarDays,
  },
  {
    label: 'AI 工具',
    href: '/ai-tools',
    icon: Bot,
  },
  {
    label: '社区讨论',
    href: '/discussions',
    icon: MessageSquare,
  },
  {
    label: '日报月报',
    href: '/articles',
    icon: Newspaper,
  },
  {
    label: '排行榜',
    href: '/leaderboard',
    icon: Trophy,
  },
  {
    label: '积分商城',
    href: '/shop',
    icon: ShoppingBag,
  },
];

const bottomNavItems = [
  {
    label: '邀请好友',
    href: '/invite',
    icon: UserPlus,
  },
  {
    label: '个人资料',
    href: '/profile',
    icon: User,
  },
  {
    label: '设置',
    href: '/settings',
    icon: Settings,
  },
];

// Sidebar transition 已移至 CSS（sidebar-gpu class in globals.css）

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useUser();
  const userLoading = useUserLoading();
  const { collapsed, toggle } = useSidebar();

  // 检测用户平台用于显示正确的快捷键（客户端挂载后设置，避免水合不匹配）
  const [shortcutKey, setShortcutKey] = useState('⌘K');
  useEffect(() => {
    setShortcutKey(isMac() ? '⌘K' : 'Ctrl+K');
  }, []);

  // 性能优化：预取所有导航路由，实现即时导航体验（仅挂载时执行一次）
  useEffect(() => {
    navItems.forEach(item => router.prefetch(item.href));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const isNavActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar - 性能优化：CSS transition 替代 framer-motion width 动画 */}
      <aside
        style={{ width: collapsed ? 72 : 260 }}
        className="hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 bg-surface-dark/90 backdrop-blur-xl border-r border-surface-dark-border sidebar-gpu transition-[width] duration-250 ease-sidebar"
      >
        {/* Logo Section */}
        <div className="p-4 h-16 flex items-center border-b border-surface-dark-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-theme-sm hover:scale-105 active:scale-95 transition-transform">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-150">
                <span className="font-medium text-sm text-foreground tracking-tight">Miracle</span>
                <span className="text-xs text-foreground/40 tracking-wide">LEARNING</span>
              </div>
            )}
          </Link>
        </div>

        {/* Search / Command Trigger */}
        {!collapsed && (
            <div className="px-3 pt-3 animate-in fade-in duration-150"
            >
              <button
                onClick={() => {
                  // Will be connected to command palette
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

        {/* Main Navigation */}
        <nav aria-label="主导航" className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="mb-2">
            {!collapsed && (
              <span className="px-3 text-xs font-medium text-foreground/30 uppercase tracking-wider">
                导航
              </span>
            )}
          </div>
          
          {navItems.map((item) => {
            const isActive = isNavActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined}>
                <div
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    !collapsed && 'hover:translate-x-0.5',
                    isActive
                      ? 'text-foreground'
                      : 'text-foreground/50 hover:text-foreground/80 hover:bg-accent'
                  )}
                >
                  {/* Active indicator — primary blue */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.12] to-transparent rounded-xl border border-primary/[0.15] transition-all duration-200" />
                  )}
                  {/* Glow dot for active — primary */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                  )}
                  <item.icon className={cn('w-[18px] h-[18px] shrink-0 relative z-10', isActive && 'text-foreground')} />
                  {!collapsed && (
                    <span className="font-medium text-sm relative z-10">
                      {item.label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-surface-dark-border to-transparent" />

          {/* Bottom Nav Items */}
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-xs font-medium text-foreground/30 uppercase tracking-wider">
                账户
              </span>
            )}
            {bottomNavItems.map((item) => {
              const isActive = isNavActive(item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined}>
                  <div
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                      !collapsed && 'hover:translate-x-0.5',
                      isActive
                        ? 'text-foreground'
                        : 'text-foreground/50 hover:text-foreground/80 hover:bg-accent'
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.12] to-transparent rounded-xl border border-primary/[0.15] transition-all duration-200" />
                    )}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                    )}
                    <item.icon className={cn('w-[18px] h-[18px] shrink-0 relative z-10', isActive && 'text-foreground')} />
                    {!collapsed && (
                      <span className="font-medium text-sm relative z-10">
                        {item.label}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse Button */}
        <div className="p-3 border-t border-surface-dark-border">
          <button
            onClick={toggle}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
              'text-foreground/50 hover:text-foreground/80 hover:bg-accent transition-all duration-200 active:scale-[0.98]'
            )}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <ChevronLeft
              className="w-[18px] h-[18px] transition-transform duration-250 ease-sidebar"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            {!collapsed && (
              <span className="font-medium text-sm">
                收起侧边栏
              </span>
            )}
          </button>
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-surface-dark-border space-y-2">
          {/* Theme Toggle */}
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'px-2.5')}>
            <ThemeToggle variant="icon" />
            {!collapsed && (
              <span className="ml-3 text-sm text-foreground/50">切换主题</span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 w-full p-2.5 rounded-lg',
                  'hover:bg-accent transition-all duration-200 active:scale-[0.99]'
                )}
              >
                {userLoading && !user ? (
                  <>
                    <Skeleton className="w-9 h-9 rounded-full" />
                    {!collapsed && (
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-16" />
                        <Skeleton className="h-2.5 w-24" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <Avatar className="w-9 h-9 border border-surface-dark-border">
                        <AvatarImage src={user?.avatar_url || ''} />
                        <AvatarFallback className="bg-secondary text-foreground/70 text-sm font-medium">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator — only show when user is logged in */}
                      {user && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-dark" />
                      )}
                    </div>
                    {!collapsed && (
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="font-medium text-sm truncate text-foreground">
                          {user?.name || '未登录'}
                        </p>
                        <p className="text-xs text-foreground/40 truncate">
                          {user?.email || '点击登录账号'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        设置
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/admin">
                          <Shield className="w-4 h-4 mr-2" />
                          管理后台
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </div>
                  <DropdownMenuSeparator />
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
