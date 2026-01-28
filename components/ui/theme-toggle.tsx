'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  /** 显示模式：仅图标、图标+文字 */
  variant?: 'icon' | 'full';
  /** 自定义类名 */
  className?: string;
}

/**
 * 主题切换组件
 * 支持亮色、暗色和系统模式
 */
export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免服务端渲染不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size={variant === 'icon' ? 'icon' : 'sm'} className={className}>
        <Sun className="h-5 w-5" />
        {variant === 'full' && <span className="ml-2">主题</span>}
      </Button>
    );
  }

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative', className)}
            aria-label="切换主题"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="w-4 h-4 mr-2" />
            亮色模式
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="w-4 h-4 mr-2" />
            暗色模式
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="w-4 h-4 mr-2" />
            跟随系统
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('justify-start', className)}>
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 mr-2" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4 mr-2" />
          ) : (
            <Monitor className="w-4 h-4 mr-2" />
          )}
          {theme === 'dark' ? '暗色模式' : theme === 'light' ? '亮色模式' : '跟随系统'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="w-4 h-4 mr-2" />
          亮色模式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="w-4 h-4 mr-2" />
          暗色模式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="w-4 h-4 mr-2" />
          跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
