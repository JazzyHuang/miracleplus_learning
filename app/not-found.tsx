'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 全局 404 页面
 * 当访问不存在的页面时显示
 * 
 * Phase 6 改进：
 * 1. 修复 history.back() 边界情况处理
 * 2. 添加 ARIA 属性
 */
export default function NotFound() {
  // Phase 6: 修复 history.back() 边界情况
  const handleGoBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      // 检查是否有历史记录可以返回
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // 没有历史记录时跳转到首页
        window.location.href = '/';
      }
    }
  }, []);

  return (
    <main 
      className="min-h-screen flex items-center justify-center bg-background p-4"
      role="main"
    >
      <div className="max-w-md w-full text-center animate-in fade-in duration-300">
        {/* 404 图标 */}
        <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <FileQuestion className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
        </div>

        {/* 错误信息 */}
        <h1 className="text-6xl font-bold text-foreground mb-2">
          404
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          页面不存在
        </h2>
        <p className="text-muted-foreground mb-8">
          抱歉，您访问的页面不存在或已被移除。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="default" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              返回首页
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            返回上一页
          </Button>
        </div>
      </div>
    </main>
  );
}
