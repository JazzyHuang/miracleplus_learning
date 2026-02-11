'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 全局导航进度条
 *
 * 纯 CSS 动画实现，零 Framer Motion 依赖
 * 监听 <a> 点击开始进度，pathname 变化完成进度
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'loading' | 'completing'>('idle');
  const [prevPath, setPrevPath] = useState(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // pathname 变化 → 完成进度条（render 阶段同步更新，React 推荐模式）
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setState('completing');
  }

  useEffect(() => {
    if (state === 'completing') {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setState('idle'), 300);
    }
  }, [state]);

  // 监听 <a> 标签点击 → 开始进度条
  const handleClick = useCallback((e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      anchor.target === '_blank' ||
      anchor.hasAttribute('download') ||
      e.metaKey || e.ctrlKey || e.shiftKey
    ) return;

    // 同页面链接不触发
    try {
      const url = new URL(href, window.location.origin);
      if (url.pathname === pathname) return;
    } catch {
      return;
    }

    setState('loading');
  }, [pathname]);

  useEffect(() => {
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [handleClick]);

  // 清理
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  if (state === 'idle') return null;

  return (
    <div
      role="progressbar"
      aria-label="页面加载中"
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
    >
      <div
        className={
          state === 'loading'
            ? 'h-full bg-primary origin-left animate-nav-progress'
            : 'h-full bg-primary origin-left w-full animate-nav-complete'
        }
      />
    </div>
  );
}
