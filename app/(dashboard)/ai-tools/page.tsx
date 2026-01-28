import { Suspense } from 'react';
import { Metadata } from 'next';
import { AIToolsContent } from './ai-tools-content';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AI 工具页面元数据
 */
export const metadata: Metadata = {
  title: 'AI 体验台 | Miracle Learning',
  description: '探索和评测各类 AI 工具，分享使用心得，与社区一起学习 AI 工具的最佳实践',
  openGraph: {
    title: 'AI 体验台 | Miracle Learning',
    description: '探索和评测各类 AI 工具，分享使用心得',
    type: 'website',
  },
};

/**
 * 页面骨架屏
 */
function AIToolsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* 搜索和筛选 */}
      <div className="mb-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      </div>

      {/* 工具网格 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

interface AIToolsPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

/**
 * AI 工具列表页
 */
export default async function AIToolsPage({ searchParams }: AIToolsPageProps) {
  const { q: searchQuery, category: categorySlug } = await searchParams;

  return (
    <Suspense fallback={<AIToolsSkeleton />}>
      <AIToolsContent 
        searchQuery={searchQuery} 
        categorySlug={categorySlug}
      />
    </Suspense>
  );
}
