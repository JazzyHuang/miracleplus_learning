import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { createPointsService, createBadgesService } from '@/lib/points';
import { RPC } from '@/lib/db-tables';
import { ProfileContent } from './profile-content';

export const metadata: Metadata = {
  title: '个人主页',
  description: '查看和编辑你的个人资料、积分和勋章',
};

/**
 * 个人中心页面（Server Component）
 * 在服务端预获取用户数据
 */
export default async function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileData />
    </Suspense>
  );
}

/**
 * 服务端数据获取组件
 * 性能优化：
 * 1. 复用 getAuthUserWithProfile() 的缓存结果，避免额外的 auth + profile 查询
 * 2. 将 workshopProgress、courseCompletion、portfolioStats 从客户端移到服务端，
 *    消除 3 次客户端请求瀑布（~300-500ms），数据随 HTML 流式到达
 */
async function ProfileData() {
  const { authUser, profile } = await getAuthUserWithProfile();

  // 未登录重定向
  if (!authUser || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();
  const pointsService = createPointsService(supabase);
  const badgesService = createBadgesService(supabase);

  // 并行获取所有数据（含原客户端 RPC 调用）
  const [pointBalance, streak, badges, transactions, workshopProgressResult, courseCompletionResult, portfolioStatsResult] = await Promise.all([
    pointsService.getPointBalance(authUser.id),
    pointsService.getUserStreak(authUser.id),
    badgesService.getUserBadges(authUser.id),
    pointsService.getPointTransactions(authUser.id, 10),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)(RPC.get_workshop_progress, { p_user_id: authUser.id }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)(RPC.get_course_completion_count, { p_user_id: authUser.id }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)(RPC.get_user_portfolio_stats, { p_user_id: authUser.id }),
  ]);

  return (
    <ProfileContent
      user={profile}
      initialPointBalance={pointBalance}
      initialStreak={streak}
      initialBadges={badges}
      initialTransactions={transactions}
      initialWorkshopProgress={workshopProgressResult.data ?? { checkin_count: 0, total_workshops: 6 }}
      initialCourseCompletion={courseCompletionResult.data ?? { completed: 0, total: 6 }}
      initialPortfolioStats={portfolioStatsResult.data ?? { submissions: 0, experiences: 0, cases: 0, notes: 0, total_likes: 0 }}
    />
  );
}

/**
 * 加载骨架屏 — 匹配 ProfileContent 实际布局
 */
function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头像 + 用户信息 + 编辑按钮 */}
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 text-center md:text-left">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="ml-auto h-9 w-24 rounded-md" />
      </div>

      {/* 统计卡片网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* 等级进度 */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      {/* 标签页 + 内容 */}
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border/50 pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
              <Skeleton className="h-10 w-10 rounded-full mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
