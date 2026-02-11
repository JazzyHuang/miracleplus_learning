'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home, WifiOff, ShieldAlert, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

type ErrorCategory = 'network' | 'auth' | 'server' | 'unknown';

function categorizeError(error: Error): { category: ErrorCategory; message: string; suggestion: string } {
  const msg = error.message.toLowerCase();

  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('networkerror')) {
    return { category: 'network', message: '网络连接异常', suggestion: '请检查网络连接后重试。' };
  }
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('auth') || msg.includes('jwt') || msg.includes('token')) {
    return { category: 'auth', message: '认证已过期', suggestion: '请重新登录后再试。' };
  }
  if (msg.includes('500') || msg.includes('server') || msg.includes('internal')) {
    return { category: 'server', message: '服务器暂时不可用', suggestion: '请稍后重试，如果问题持续请联系管理员。' };
  }
  return { category: 'unknown', message: '出错了', suggestion: '抱歉，应用程序遇到了一个错误。请尝试刷新页面或返回首页。' };
}

const errorIcons: Record<ErrorCategory, typeof AlertCircle> = {
  network: WifiOff,
  auth: ShieldAlert,
  server: ServerCrash,
  unknown: AlertCircle,
};

export default function Error({ error, reset }: ErrorProps) {
  const prefersReducedMotion = useReducedMotion();
  const errorInfo = useMemo(() => categorizeError(error), [error]);
  const Icon = errorIcons[errorInfo.category];

  useEffect(() => {
    // 结构化错误日志，便于生产环境排查
    console.error('[AppError]', {
      message: error.message,
      digest: error.digest,
      category: errorInfo.category,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }, [error, errorInfo.category]);

  const motionProps = prefersReducedMotion
    ? { initial: false }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  const iconMotionProps = prefersReducedMotion
    ? { initial: false }
    : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.1, type: 'spring' as const, stiffness: 200 } };

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
          <Icon className="w-10 h-10 text-destructive" aria-hidden="true" />
        </m.div>

        {/* 错误信息 */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {errorInfo.message}
        </h1>
        <p className="text-muted-foreground mb-6">
          {errorInfo.suggestion}
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

        {/* 生产环境也显示 digest 以便用户反馈 */}
        {process.env.NODE_ENV === 'production' && error.digest && (
          <p className="text-xs text-muted-foreground/50 mb-4">
            错误编号: {error.digest}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {errorInfo.category === 'auth' ? (
            <Link href="/login">
              <Button variant="default" className="w-full sm:w-auto" aria-label="前往登录页面">
                <ShieldAlert className="w-4 h-4 mr-2" aria-hidden="true" />
                重新登录
              </Button>
            </Link>
          ) : (
            <Button onClick={reset} variant="default" aria-label="重试加载页面">
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              重试
            </Button>
          )}
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
