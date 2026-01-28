'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 全局根级错误边界
 * 捕获根布局级别的错误
 * 
 * Phase 6 改进：
 * 1. 添加返回首页按钮
 * 2. 添加 ARIA 属性
 * 3. 使用 CSS 变量兼容深色模式
 * 
 * 注意：此组件必须包含 <html> 和 <body> 标签
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // 记录错误到控制台或错误追踪服务
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          backgroundColor: 'var(--background, #fafafa)', 
          color: 'var(--foreground, #0a0a0a)' 
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
            <AlertCircle className="w-10 h-10" style={{ color: '#dc2626' }} aria-hidden="true" />
          </div>

          {/* 错误信息 */}
          <h1 className="text-2xl font-bold mb-2">
            系统错误
          </h1>
          <p className="mb-6" style={{ color: 'var(--muted-foreground, #737373)' }}>
            抱歉，系统遇到了一个严重错误。请尝试刷新页面。
          </p>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'var(--primary, #0a0a0a)', 
                color: 'var(--primary-foreground, #fafafa)' 
              }}
              aria-label="重试加载页面"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              重新加载
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border transition-colors"
              style={{ 
                borderColor: 'var(--border, #e5e5e5)',
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
