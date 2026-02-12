'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/error-tracking';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 管理后台认证错误边界
 * 捕获 AdminAuthGuard 中 use() hook 的 promise rejection
 */
export class AdminAuthErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, {
      source: 'AdminAuthErrorBoundary',
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4" role="alert">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">管理面板加载失败</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            权限验证过程中出现错误，请刷新页面重试。
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="default" size="sm">
              <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
              重试
            </Button>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-1.5" aria-hidden="true" />
                返回首页
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
