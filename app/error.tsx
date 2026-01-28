'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 全局错误边界组件
 * 捕获并处理运行时错误
 * 
 * Phase 6 改进：
 * 1. 添加 ARIA 属性（role="alert", aria-live）
 * 2. 支持 prefers-reduced-motion
 * 3. 使用设计系统 token
 */
export default function Error({ error, reset }: ErrorProps) {
  const prefersReducedMotion = useReducedMotion();
  
  useEffect(() => {
    // 记录错误到控制台或错误追踪服务
    // 生产环境可集成 Sentry 等服务
    console.error('Application error:', error);
  }, [error]);

  const motionProps = prefersReducedMotion
    ? { initial: false }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  const iconMotionProps = prefersReducedMotion
    ? { initial: false }
    : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.1, type: 'spring', stiffness: 200 } };

  return (
    <main 
      className="min-h-screen flex items-center justify-center bg-background p-4"
      role="alert"
      aria-live="assertive"
    >
      <m.div
        {...motionProps}
        className="max-w-md w-full text-center"
      >
        {/* 错误图标 */}
        <m.div
          {...iconMotionProps}
          className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6"
        >
          <AlertCircle className="w-10 h-10 text-destructive" aria-hidden="true" />
        </m.div>

        {/* 错误信息 */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          出错了
        </h1>
        <p className="text-muted-foreground mb-6">
          抱歉，应用程序遇到了一个错误。请尝试刷新页面或返回首页。
        </p>

        {/* 错误详情（仅开发环境显示） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-muted rounded-lg text-left">
            <p className="text-sm font-mono text-muted-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" aria-label="重试加载页面">
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            重试
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              返回首页
            </Button>
          </Link>
        </div>
      </m.div>
    </main>
  );
}
