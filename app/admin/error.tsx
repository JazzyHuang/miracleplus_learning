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

function categorizeError(error: Error): { category: ErrorCategory; message: string } {
  const msg = error.message.toLowerCase();
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('load failed')) {
    return { category: 'network', message: '网络连接异常' };
  }
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('forbidden') || msg.includes('403')) {
    return { category: 'auth', message: '权限不足或登录已过期' };
  }
  if (msg.includes('500') || msg.includes('server') || msg.includes('internal')) {
    return { category: 'server', message: '服务暂时不可用' };
  }
  return { category: 'unknown', message: '管理面板出错' };
}

const errorIcons: Record<ErrorCategory, typeof AlertCircle> = {
  network: WifiOff,
  auth: ShieldAlert,
  server: ServerCrash,
  unknown: AlertCircle,
};

/**
 * Admin 路由组错误边界
 */
export default function AdminError({ error, reset }: ErrorProps) {
  const errorInfo = useMemo(() => categorizeError(error), [error]);
  const Icon = errorIcons[errorInfo.category];

  useEffect(() => {
    console.error('[AdminError]', {
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
        <h2 className="text-xl font-semibold text-foreground mb-2">{errorInfo.message}</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {errorInfo.category === 'auth' ? '请重新登录或联系超级管理员。' : '请重试或联系技术支持。'}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-secondary rounded-lg text-left">
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
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
              返回管理面板
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
