'use client';

import { cn } from '@/lib/utils';

interface SkipLinkProps {
  /** 跳转目标 ID */
  targetId?: string;
  /** 显示文本 */
  children?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 跳过链接组件
 * 用于键盘导航，允许用户跳过导航直接到主要内容
 * 只在 Tab 聚焦时显示
 */
export function SkipLink({
  targetId = 'main-content',
  children = '跳转到主要内容',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // 默认隐藏
        'sr-only',
        // 聚焦时显示
        'focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100',
        'focus:px-4 focus:py-2 focus:bg-background focus:text-foreground',
        'focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary',
        'transition-all duration-150',
        className
      )}
    >
      {children}
    </a>
  );
}
