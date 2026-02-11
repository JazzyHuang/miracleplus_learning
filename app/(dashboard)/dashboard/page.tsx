import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { getUserLearningStats, getCachedLeaderboard } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { createPointsService } from '@/lib/points';
import { RPC } from '@/lib/db-tables';
import { HomeContent } from '@/components/dashboard/home-content';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: '仪表板',
  description: '查看你的学习进度和统计数据',
};

/**
 * 首页 - Server Component
 *
 * 性能优化：使用精细化 Suspense 边界
 * - 页面结构立即显示（零等待）
 * - 统计数据通过 Suspense 流式加载
 */
export default async function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

/**
 * 服务端数据获取组件 — Suspense 内异步加载
 *
 * 性能优化：将 PointCard/MiniLeaderboard/WeeklyStars 的数据从客户端移到服务端
 * 消除 hydration 后的 3 次客户端请求瀑布，数据随 HTML 流式到达
 */
async function DashboardData() {
  const { authUser } = await getAuthUserWithProfile();

  if (!authUser) {
    return <HomeContent stats={null} />;
  }

  const supabase = await createClient();
  const pointsService = createPointsService(supabase);

  // 并行获取所有 Dashboard 数据（学习统计 + 游戏化组件数据）
  // 注意：supabase.rpc() 返回 PostgrestFilterBuilder（thenable 但无 .catch()），
  // 需用 Promise.resolve() 包装才能安全 .catch()
  const [stats, pointBalance, streak, leaderboardTop3, weeklyGainersResult, todayPoints] = await Promise.all([
    getUserLearningStats(authUser.id).catch(error => {
      logger.error('获取用户学习统计失败:', error, { userId: authUser.id });
      return null;
    }),
    pointsService.getPointBalance(authUser.id).catch(() => null),
    pointsService.getUserStreak(authUser.id).catch(() => null),
    getCachedLeaderboard(3).catch(() => []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise.resolve((supabase.rpc as any)(RPC.get_weekly_top_gainers)).catch(() => ({ data: null })),
    pointsService.getTodayPoints(authUser.id).catch(() => 0),
  ]);

  return (
    <HomeContent
      stats={stats}
      initialPointBalance={pointBalance}
      initialTodayPoints={todayPoints}
      initialStreak={streak}
      initialLeaderboardTop3={leaderboardTop3}
      initialWeeklyGainers={weeklyGainersResult?.data ?? []}
    />
  );
}

/**
 * 仪表板骨架屏 — 匹配 HomeContent 实际布局
 */
function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 问候 + 打卡连续 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
