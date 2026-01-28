'use client';

import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * 页面过渡动画组件
 * 
 * Phase 5 改进：
 * 1. 支持 prefers-reduced-motion
 * 2. 使用更平滑的过渡
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // 如果用户偏好减少动画，则禁用过渡
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
