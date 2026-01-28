'use client';

import { ThemeProvider } from 'next-themes';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * 全局 Providers 组件
 * 包含主题和动画 Provider
 * 
 * Phase 2 改进：
 * - 添加 MotionConfig 支持减少动画偏好
 * - 自动响应用户的 prefers-reduced-motion 设置
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LazyMotion features={domAnimation} strict>
        {/* 自动响应用户的减少动画偏好设置 */}
        <MotionConfig reducedMotion="user">
          {children}
        </MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  );
}
