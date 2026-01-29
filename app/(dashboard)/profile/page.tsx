import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/supabase/auth';
import { createPointsService, createBadgesService } from '@/lib/points';
import { ProfileContent } from './profile-content';

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
 */
async function ProfileData() {
  const authUser = await getAuthUser();
  
  // 未登录重定向
  if (!authUser) {
    redirect('/login');
  }

  const supabase = await createClient();
  
  // 获取用户详细信息
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, email, name, avatar_url')
    .eq('id', authUser.id)
    .single();

  if (!userProfile) {
    redirect('/login');
  }

  const pointsService = createPointsService(supabase);
  const badgesService = createBadgesService(supabase);

  // 并行获取所有数据
  const [pointBalance, streak, badges, transactions] = await Promise.all([
    pointsService.getPointBalance(authUser.id),
    pointsService.getUserStreak(authUser.id),
    badgesService.getUserBadges(authUser.id),
    pointsService.getPointTransactions(authUser.id, 10),
  ]);

  return (
    <ProfileContent
      user={userProfile}
      initialPointBalance={pointBalance}
      initialStreak={streak}
      initialBadges={badges}
      initialTransactions={transactions}
    />
  );
}

/**
 * 加载骨架屏
 */
function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
