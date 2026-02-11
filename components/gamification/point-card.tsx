'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Progress } from '@/components/ui/progress';
import { useCachedQuery, seedCache } from '@/hooks/use-cached-query';
import {
  createPointsService,
  getUserLevel,
  getPointsToNextLevel,
  type PointBalance,
} from '@/lib/points';

interface PointCardProps {
  initialBalance?: PointBalance | null;
  initialTodayPoints?: number;
}

/**
 * Point Card — 白色卡片 + 品牌蓝色强调
 */
export function PointCard({ initialBalance, initialTodayPoints }: PointCardProps) {
  const { user } = useUser();

  // 服务端数据预填充缓存，useCachedQuery 会直接命中，跳过客户端请求
  if (user && initialBalance !== undefined) {
    seedCache(`point-card-${user.id}`, { balance: initialBalance, todayPoints: initialTodayPoints ?? 0 });
  }

  // 性能优化：使用缓存 hook，导航时瞬间显示上次数据
  const fetcher = useCallback(async () => {
    if (!user) return null;
    const supabase = createClient();
    const pointsService = createPointsService(supabase);
    const [userBalance, today] = await Promise.all([
      pointsService.getPointBalance(user.id),
      pointsService.getTodayPoints(user.id),
    ]);
    return { balance: userBalance, todayPoints: today };
  }, [user]);

  const { data, loading, error } = useCachedQuery(
    `point-card-${user?.id}`,
    fetcher,
    { ttl: 120000, enabled: !!user }
  );

  const balance = data?.balance ?? null;
  const todayPoints = data?.todayPoints ?? 0;

  if (loading && !data) {
    return <PointCardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="relative p-6 rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
        <div className="text-center text-sm text-muted-foreground py-4">
          加载积分失败
        </div>
      </div>
    );
  }

  if (!user || !balance) {
    return <PointCardSkeleton />;
  }

  const currentLevel = getUserLevel(balance.totalPoints);
  const pointsToNext = getPointsToNextLevel(balance.totalPoints);
  const progressPercent =
    currentLevel.maxPoints !== Infinity
      ? ((balance.totalPoints - currentLevel.minPoints) /
          (currentLevel.maxPoints - currentLevel.minPoints + 1)) *
        100
      : 100;

  return (
    <div className="relative p-6 rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shadow-theme-sm">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">我的积分</p>
              <p className="text-3xl font-bold text-card-foreground tracking-tight">{balance.totalPoints}</p>
            </div>
          </div>

          {todayPoints > 0 && (
            <div 
              className="text-right px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 animate-scale-in"
              style={{ '--animation-delay': '200ms' } as React.CSSProperties}
            >
              <p className="text-xs text-success/70 uppercase tracking-wider">今日</p>
              <p className="text-lg font-bold text-success">+{todayPoints}</p>
            </div>
          )}
        </div>

        {/* Level Progress */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-primary" />
              {currentLevel.name}
            </span>
            {pointsToNext !== null && (
              <span className="text-muted-foreground text-xs">
                还需 <span className="text-primary font-medium">{pointsToNext}</span> 积分升级
              </span>
            )}
          </div>
          <Progress value={progressPercent} variant="brand" />
        </div>

        {/* Action */}
        <Link href="/profile">
          <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition-all duration-200 group">
            <span className="text-sm text-muted-foreground group-hover:text-card-foreground transition-colors">查看积分详情</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Loading skeleton — 白色卡片骨架
 */
function PointCardSkeleton() {
  return (
    <div className="relative p-6 rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <div className="h-6 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-1 w-full rounded bg-muted animate-pulse" />
      </div>
      <div className="h-11 w-full rounded-lg bg-muted animate-pulse" />
    </div>
  );
}
