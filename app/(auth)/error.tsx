'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Auth 路由组错误边界
 */
export default function AuthError({ error, reset }: ErrorProps) {
  const isNetworkError = /fetch|network|load failed/i.test(error.message);

  useEffect(() => {
    console.error('[AuthError]', {
      message: error.message,
      digest: error.digest,
      isNetwork: isNetworkError,
    });
  }, [error, isNetworkError]);

  const Icon = isNetworkError ? WifiOff : AlertCircle;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" role="alert" aria-live="assertive">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-destructive" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {isNetworkError ? '网络连接异常' : '认证服务出错'}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {isNetworkError ? '请检查网络连接后重试。' : '请稍后重试或返回首页。'}
        </p>
        {process.env.NODE_ENV === 'production' && error.digest && (
          <p className="text-xs text-muted-foreground/50 mb-4">
            错误编号: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
            重试
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
              首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
