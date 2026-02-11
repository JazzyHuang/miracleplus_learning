'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home, WifiOff } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 全局根级错误边界
 * 捕获根布局级别的错误
 *
 * 注意：此组件必须包含 <html> 和 <body> 标签
 * 不能使用 shadcn/ui 组件（根布局已崩溃，CSS 可能未加载）
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const isNetworkError = /fetch|network|load failed/i.test(error.message);

  useEffect(() => {
    console.error('[GlobalError]', {
      message: error.message,
      digest: error.digest,
      isNetwork: isNetworkError,
    });
  }, [error, isNetworkError]);

  const Icon = isNetworkError ? WifiOff : AlertCircle;

  return (
    <html lang="zh-CN">
      <body
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: 'var(--background, #FAFAF7)',
          color: 'var(--foreground, #1C1917)'
        }}
      >
        <main
          className="max-w-md w-full text-center"
          role="alert"
          aria-live="assertive"
        >
          {/* 错误图标 */}
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }}
          >
            <Icon className="w-10 h-10" style={{ color: 'var(--destructive, #C53030)' }} aria-hidden="true" />
          </div>

          {/* 错误信息 */}
          <h1 className="text-2xl font-bold mb-2">
            {isNetworkError ? '网络连接异常' : '系统错误'}
          </h1>
          <p className="mb-6" style={{ color: 'var(--muted-foreground, #736F6B)' }}>
            {isNetworkError
              ? '请检查网络连接后刷新页面。'
              : '抱歉，系统遇到了一个严重错误。请尝试刷新页面。'}
          </p>

          {/* 生产环境显示 digest 以便用户反馈 */}
          {error.digest && (
            <p className="mb-4 text-xs" style={{ color: 'var(--muted-foreground, #736F6B)', opacity: 0.6 }}>
              错误编号: {error.digest}
            </p>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--primary, #1C1917)',
                color: 'var(--primary-foreground, #FAFAF7)'
              }}
              aria-label="重试加载页面"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              重新加载
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside Next.js router, Link unavailable */}
            <a
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--border, #E2DFD9)',
                backgroundColor: 'transparent',
              }}
            >
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              返回首页
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
