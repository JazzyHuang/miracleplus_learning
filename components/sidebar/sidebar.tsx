'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';
import { useSidebar } from './sidebar-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  CalendarDays,
  BookOpen,
  ChevronLeft,
  LogIn,
  LogOut,
  Settings,
  Shield,
  Menu,
} from 'lucide-react';

const navItems = [
  {
    label: 'Workshop',
    href: '/workshop',
    icon: CalendarDays,
    description: '活动打卡',
  },
  {
    label: '线上资源',
    href: '/courses',
    icon: BookOpen,
    description: '课程学习',
  },
];

// Smooth Apple-style easing curve
const sidebarTransition = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as const,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useUser();
  const { collapsed, toggle } = useSidebar();

  const handleLoginClick = () => {
    router.push('/login');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={sidebarTransition}
        className="hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed left-0 top-0 z-40"
      >
        {/* Logo Section */}
        <div className="p-5 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4 text-background" />
            </motion.div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <h1 className="font-semibold text-base text-sidebar-foreground">Miracle</h1>
                  <p className="text-xs text-muted-foreground">Learning</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.1 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col"
                      >
                        <span className="font-medium text-sm">{item.label}</span>
                        <span className="text-xs opacity-60">{item.description}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <div className="px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="w-full justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={sidebarTransition}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </Button>
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  'flex items-center gap-3 w-full p-2.5 rounded-lg',
                  'hover:bg-sidebar-accent transition-colors duration-150'
                )}
              >
                <Avatar className="w-9 h-9 border border-border">
                  <AvatarImage src={user?.avatar_url || ''} />
                  <AvatarFallback className="bg-foreground text-background text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 text-left overflow-hidden"
                    >
                      <p className="font-medium text-sm truncate text-sidebar-foreground">
                        {user?.name || '未登录'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || '点击登录账号'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    设置
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push('/admin')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      管理后台
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onSelect={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={handleLoginClick}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  登录
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <MobileNav pathname={pathname} user={user} onSignOut={handleSignOut} />
    </>
  );
}

function MobileNav({
  pathname,
  user,
  onSignOut,
}: {
  pathname: string;
  user: import('@/types/database').User | null;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleMobileLoginClick = () => {
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-md border-b border-border z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold">Miracle Learning</span>
        </Link>
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="w-9 h-9 border border-border">
                <AvatarImage src={user?.avatar_url || ''} />
                <AvatarFallback className="bg-foreground text-background text-sm">{user?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user?.name || '未登录'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || '点击登录账号'}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            {user ? (
              <>
                {user.role === 'admin' && (
                  <DropdownMenuItem onSelect={() => router.push('/admin')}>
                    <Shield className="w-4 h-4 mr-2" />
                    管理后台
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={onSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={handleMobileLoginClick}>
                <LogIn className="w-4 h-4 mr-2" />
                登录
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/90 backdrop-blur-md border-t border-border z-40">
        <div className="flex items-center justify-around h-full px-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors duration-150',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className="text-xs font-medium">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
