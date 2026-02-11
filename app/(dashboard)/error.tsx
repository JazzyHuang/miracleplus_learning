'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft, WifiOff, ShieldAlert, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

type ErrorCategory = 'network' | 'auth' | 'server' | 'unknown';

function categorizeError(error: Error): { category: ErrorCategory; message: string; suggestion: string } {
  const msg = error.message.toLowerCase();

  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed')) {
    return { category: 'network', message: '网络连接异常', suggestion: '请检查网络连接后重试。' };
  }
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('auth') || msg.includes('jwt') || msg.includes('token')) {
    return { category: 'auth', message: '登录已过期', suggestion: '请重新登录后继续操作。' };
  }
  if (msg.includes('500') || msg.includes('server') || msg.includes('internal')) {
    return { category: 'server', message: '服务暂时不可用', suggestion: '请稍后重试。' };
  }
  return { category: 'unknown', message: '页面加载出错', suggestion: '抱歉，页面遇到了一个错误。请尝试重试或返回仪表板。' };
}

const errorIcons: Record<ErrorCategory, typeof AlertCircle> = {
  network: WifiOff,
  auth: ShieldAlert,
  server: ServerCrash,
  unknown: AlertCircle,
};

/**
 * Dashboard 路由组错误边界
 * 捕获 Dashboard 内的运行时错误，提供重试和返回选项
 */
export default function DashboardError({ error, reset }: ErrorProps) {
  const errorInfo = useMemo(() => categorizeError(error), [error]);
  const Icon = errorIcons[errorInfo.category];

  useEffect(() => {
    console.error('[DashboardError]', {
      message: error.message,
      digest: error.digest,
      category: errorInfo.category,
    });
  }, [error, errorInfo.category]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4" role="alert" aria-live="assertive">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-destructive" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-medium text-foreground mb-2">{errorInfo.message}</h2>
        <p className="text-foreground/50 mb-6 text-sm">
          {errorInfo.suggestion}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-card rounded-xl border border-border/50 text-left">
            <p className="text-xs font-mono text-muted-foreground break-all">{error.message}</p>
          </div>
        )}
        {process.env.NODE_ENV === 'production' && error.digest && (
          <p className="text-xs text-muted-foreground/50 mb-4">
            错误编号: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          {errorInfo.category === 'auth' ? (
            <Link href="/login">
              <Button variant="default" size="sm">
                <ShieldAlert className="w-4 h-4 mr-1.5" aria-hidden="true" />
                重新登录
              </Button>
            </Link>
          ) : (
            <Button onClick={reset} variant="default" size="sm">
              <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
              重试
            </Button>
          )}
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
              返回仪表板
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
