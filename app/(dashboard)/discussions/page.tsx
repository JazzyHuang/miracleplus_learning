import { Suspense } from 'react';
import { Metadata } from 'next';
import { DiscussionsContent } from './discussions-content';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 讨论区页面元数据
 */
export const metadata: Metadata = {
  title: '讨论区 | Miracle Learning',
  description: '与社区成员交流学习心得，分享职场经验，探讨 AI 技术发展',
  openGraph: {
    title: '讨论区 | Miracle Learning',
    description: '与社区成员交流学习心得',
    type: 'website',
  },
};

/**
 * 页面骨架屏
 */
function DiscussionsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 头部 */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* 标签和发布按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* 讨论列表 */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * 讨论区列表页
 */
export default function DiscussionsPage() {
  return (
    <Suspense fallback={<DiscussionsSkeleton />}>
      <DiscussionsContent />
    </Suspense>
  );
}
