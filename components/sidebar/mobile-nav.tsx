'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  CalendarDays,
  BookOpen,
  LogIn,
  LogOut,
  Settings,
  Shield,
  Menu,
  Home,
  Bot,
  User,
} from 'lucide-react';
import type { User as UserType } from '@/types/database';

const mobileNavItems = [
  { label: '首页', href: '/dashboard', icon: Home },
  { label: '课程', href: '/courses', icon: BookOpen },
  { label: 'Workshop', href: '/workshop', icon: CalendarDays },
  { label: 'AI工具', href: '/ai-tools', icon: Bot },
  { label: '我的', href: '/profile', icon: User },
];

function isNavActive(href: string, pathname: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

export function MobileNav({
  pathname,
  user,
  onSignOut,
}: {
  pathname: string;
  user: UserType | null;
  onSignOut: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface-dark/90 backdrop-blur-xl border-b border-surface-dark-border z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-medium text-sm text-foreground">Miracle</span>
        </Link>
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors" aria-label="打开菜单">
              <Menu className="w-5 h-5 text-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64">
            <div className="flex items-center gap-3 p-3 border-b border-border">
              <Avatar className="w-10 h-10 border border-border">
                <AvatarImage src={user?.avatar_url || ''} />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">{user?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm text-card-foreground">{user?.name || '未登录'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || '点击登录账号'}</p>
              </div>
            </div>
            <div className="py-1">
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      设置
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="w-4 h-4 mr-2" />
                        管理后台
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={onSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <LogIn className="w-4 h-4 mr-2" />
                    登录
                  </Link>
                </DropdownMenuItem>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav aria-label="移动端导航" className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface-dark/90 backdrop-blur-xl border-t border-surface-dark-border z-40 pb-safe">
        <div className="flex items-center justify-around h-full px-2">
          {mobileNavItems.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link key={item.href} href={item.href} className="flex-1" aria-current={active ? 'page' : undefined}>
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-lg transition-all duration-200',
                    'active:scale-90 active:opacity-70',
                    active ? 'text-foreground' : 'text-foreground/40'
                  )}
                >
                  <div className="relative">
                    <item.icon className={cn("w-5 h-5", active && "stroke-2")} />
                    {active && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 gradient-brand rounded-full" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    active ? "gradient-text-brand" : ""
                  )}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
