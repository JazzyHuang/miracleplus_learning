import { Suspense } from 'react';
import { Metadata } from 'next';
import { ArticlesContent } from './articles-content';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: '日报月报 - Miracle Learning',
  description: '阅读最新的 AI 学习日报和月报',
};

export default async function ArticlesPage() {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Suspense fallback={<ArticlesSkeleton />}>
        <ArticlesContent />
      </Suspense>
    </div>
  );
}

function ArticlesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
