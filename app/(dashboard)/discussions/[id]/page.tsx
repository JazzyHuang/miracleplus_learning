import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DiscussionDetailContent } from './discussion-detail-content';
import { createClient } from '@/lib/supabase/server';
import { createDiscussionsService } from '@/lib/community';
import { Skeleton } from '@/components/ui/skeleton';

interface DiscussionDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 动态生成元数据
 */
export async function generateMetadata({
  params,
}: DiscussionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const discussionsService = createDiscussionsService(supabase);
  const discussion = await discussionsService.getDiscussionById(id);

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
  };
}

/**
 * 页面骨架屏
 */
function DiscussionDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* 返回按钮 */}
      <Skeleton className="h-10 w-32 mb-6" />

      {/* 话题头部 */}
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

      {/* 评论区 */}
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
 */
export default async function DiscussionDetailPage({
  params,
}: DiscussionDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const discussionsService = createDiscussionsService(supabase);
  const discussion = await discussionsService.getDiscussionById(id);

  if (!discussion) {
    notFound();
  }

  return (
    <Suspense fallback={<DiscussionDetailSkeleton />}>
      <DiscussionDetailContent discussion={discussion} />
    </Suspense>
  );
}
