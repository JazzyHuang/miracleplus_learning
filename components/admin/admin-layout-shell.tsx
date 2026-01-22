'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  Shield,
  BookOpen,
  CalendarDays,
  Home,
  ChevronLeft,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/types/database';

const navItems = [
  {
    label: '概览',
    href: '/admin',
    icon: Home,
  },
  {
    label: '课程管理',
    href: '/admin/courses',
    icon: BookOpen,
  },
  {
    label: '活动管理',
    href: '/admin/workshops',
    icon: CalendarDays,
  },
];

interface AdminLayoutShellProps {
  children: React.ReactNode;
  user: User | null;
}

export function AdminLayoutShell({ children, user }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMobileNav, setShowMobileNav] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'local' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="h-14 bg-foreground text-background border-b fixed top-0 left-0 right-0 z-50 flex items-center px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-background hover:bg-background/10"
            onClick={() => setShowMobileNav(!showMobileNav)}
          >
            {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <Link href="/admin" className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-semibold hidden sm:inline">管理后台</span>
          </Link>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-background/80 hover:text-background hover:bg-background/10">
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回前台
            </Button>
          </Link>
          <Avatar className="w-8 h-8 border border-background/30">
            <AvatarImage src={user?.avatar_url || ''} />
            <AvatarFallback className="text-xs bg-background text-foreground">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside
          className={cn(
            'w-56 bg-card border-r border-border fixed lg:relative inset-y-14 lg:inset-y-0 left-0 z-40',
            'transform lg:transform-none transition-transform duration-200',
            showMobileNav ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={() => setShowMobileNav(false)}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.1 }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Sign out button at bottom */}
          <div className="absolute bottom-4 left-3 right-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {showMobileNav && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setShowMobileNav(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
