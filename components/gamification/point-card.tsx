'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Star, TrendingUp, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createPointsService,
  getUserLevel,
  getPointsToNextLevel,
  type PointBalance,
} from '@/lib/points';

/**
 * 积分卡片组件
 * 展示用户积分、等级和进度
 */
export function PointCard() {
  const { user } = useUser();
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [todayPoints, setTodayPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const supabase = createClient();
      const pointsService = createPointsService(supabase);

      const [userBalance, today] = await Promise.all([
        pointsService.getPointBalance(user.id),
        pointsService.getTodayPoints(user.id),
      ]);

      setBalance(userBalance);
      setTodayPoints(today);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <PointCardSkeleton />;
  }

  if (!user || !balance) {
    return null;
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
    <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">我的积分</p>
                <p className="text-2xl font-bold">{balance.totalPoints}</p>
              </div>
            </div>

            {todayPoints > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">今日获得</p>
                <p className="text-lg font-bold text-green-500">+{todayPoints}</p>
              </div>
            )}
          </div>

          {/* 等级进度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                {currentLevel.name}
              </span>
              {pointsToNext !== null && (
                <span className="text-muted-foreground">
                  还需 {pointsToNext} 积分升级
                </span>
              )}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* 查看详情按钮 */}
          <Link href="/profile" className="block mt-4">
            <Button variant="ghost" className="w-full justify-between" size="sm">
              <span>查看积分详情</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </m.div>
  );
}

/**
 * 加载骨架屏
 */
function PointCardSkeleton() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <Skeleton className="h-9 w-full mt-4" />
      </CardContent>
    </Card>
  );
}
