import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { createCacheClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/supabase/auth';
import { createPointsService } from '@/lib/points';
import { LeaderboardContent } from './leaderboard-content';

/**
 * 排行榜页面（Server Component）
 * 在服务端预获取数据，提升首屏加载速度
 */
export default async function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardData />
    </Suspense>
  );
}

/**
 * 服务端数据获取组件
 */
async function LeaderboardData() {
  const supabase = createCacheClient();
  const pointsService = createPointsService(supabase);
  
  // 获取当前用户（可选）
  const authUser = await getAuthUser();
  
  // 并行获取排行榜数据和用户排名
  const [leaderboard, userRank] = await Promise.all([
    pointsService.getLeaderboard(50),
    authUser ? pointsService.getUserRank(authUser.id) : Promise.resolve(null),
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
