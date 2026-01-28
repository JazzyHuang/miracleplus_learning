import { Suspense } from 'react';
import { Metadata } from 'next';
import { getWorkshops } from '@/lib/supabase/queries';
import { WorkshopList } from '@/components/workshop';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Phase 6: 添加页面元数据用于 SEO
 */
export const metadata: Metadata = {
  title: '线下活动 | Miracle Learning',
  description: '参与奇绩创坛线下活动，与优秀创业者交流学习，拓展人脉资源',
  openGraph: {
    title: '线下活动 | Miracle Learning',
    description: '参与奇绩创坛线下活动，与优秀创业者交流学习',
    type: 'website',
  },
};

interface WorkshopListPageProps {
  searchParams: Promise<{ q?: string }>;
}

/**
 * Workshop 列表骨架屏
 */
function WorkshopListSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 异步 Workshop 列表组件
 */
async function AsyncWorkshopList({ searchQuery }: { searchQuery?: string }) {
  const workshops = await getWorkshops();
  return <WorkshopList workshops={workshops} searchQuery={searchQuery} />;
}

/**
 * P2 优化：使用 Suspense 实现流式渲染
 */
export default async function WorkshopListPage({ searchParams }: WorkshopListPageProps) {
  const { q: searchQuery } = await searchParams;

  return (
    <Suspense fallback={<WorkshopListSkeleton />}>
      <AsyncWorkshopList searchQuery={searchQuery} />
    </Suspense>
  );
}
