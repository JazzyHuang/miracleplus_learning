import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { getCachedLeaderboard, getCachedUserRank } from '@/lib/supabase/queries';
import { LeaderboardContent } from './leaderboard-content';

export const metadata: Metadata = {
  title: '排行榜',
  description: '查看积分排名和学习排行',
};

/**
 * 排行榜页面（Server Component）
 * 
 * 性能优化：精细化 Suspense 边界
 * - 页面标题立即显示
 * - 排行榜数据通过 Suspense 流式加载
 */
export default async function LeaderboardPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* 标题区域 — 立即显示，不等待数据 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">排行榜</h1>
        <p className="text-muted-foreground mt-1">积分排名</p>
      </div>
      {/* 数据区域 — Suspense 流式加载 */}
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardData />
      </Suspense>
    </div>
  );
}

/**
 * 服务端数据获取组件
 */
async function LeaderboardData() {
  // 获取当前用户（可选）
  const { authUser } = await getAuthUserWithProfile();

  // 并行获取排行榜数据（缓存 60s）和用户排名（缓存 60s）
  const [leaderboard, userRank] = await Promise.all([
    getCachedLeaderboard(50),
    authUser ? getCachedUserRank(authUser.id) : Promise.resolve(null),
  ]);

  return (
    <LeaderboardContent
      initialLeaderboard={leaderboard}
      currentUserId={authUser?.id}
      currentUserRank={userRank}
    />
  );
}

/**
 * 加载骨架屏
 */
function LeaderboardSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
