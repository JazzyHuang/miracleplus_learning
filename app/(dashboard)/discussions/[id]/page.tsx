import { cache, Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DiscussionDetailContent } from './discussion-detail-content';
import { createClient } from '@/lib/supabase/server';
import { createDiscussionsService } from '@/lib/community';
import { Skeleton } from '@/components/ui/skeleton';

interface DiscussionDetailPageProps {
  params: Promise<{ id: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

/**
 * React cache() 确保同一请求内 generateMetadata 和 page 共享同一次查询
 */
const getCachedDiscussion = cache(async (id: string) => {
  const supabase = await createClient();
  const service = createDiscussionsService(supabase);
  return service.getDiscussionById(id);
});

/**
 * 动态生成元数据
 */
export async function generateMetadata({
  params,
}: DiscussionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const discussion = await getCachedDiscussion(id);

  if (!discussion) {
    return {
      title: '话题未找到 | Miracle Learning',
    };
  }

  return {
    title: `${discussion.title} | 讨论区 | Miracle Learning`,
    description: discussion.content.slice(0, 160),
    openGraph: {
      title: discussion.title,
      description: discussion.content.slice(0, 160),
      type: 'article',
    },
    alternates: {
      canonical: `${BASE_URL}/discussions/${id}`,
    },
  };
}
/**
 * 页面骨架屏
 */
function DiscussionDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <Skeleton className="h-10 w-32 mb-6" />
      <div className="space-y-4 mb-8">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <Skeleton className="h-6 w-24 mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * 讨论详情页
 * 使用 getCachedDiscussion 避免 generateMetadata 和 page 双重查询
 * 浏览量递增仅在 page component 中执行一次
 */
export default async function DiscussionDetailPage({
  params,
}: DiscussionDetailPageProps) {
  const { id } = await params;
  const discussion = await getCachedDiscussion(id);

  if (!discussion) {
    notFound();
  }

  // View count 只在 page component 中递增一次（不在 generateMetadata 中）
  const supabase = await createClient();
  const service = createDiscussionsService(supabase);
  await service.incrementDiscussionViewCount(id);

  return (
    <Suspense fallback={<DiscussionDetailSkeleton />}>
      <DiscussionDetailContent discussion={discussion} />
    </Suspense>
  );
}
