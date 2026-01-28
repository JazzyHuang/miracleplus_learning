'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Trophy, Star, ChevronRight, Crown, Medal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createPointsService, type LeaderboardEntry } from '@/lib/points';

/**
 * 首页迷你排行榜组件
 * 展示 TOP3 用户
 */
export function MiniLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const supabase = createClient();
      const pointsService = createPointsService(supabase);
      const entries = await pointsService.getLeaderboard(3);
      setLeaderboard(entries);
      setLoading(false);
    };

    fetchLeaderboard();

    // 设置 Realtime 订阅（监听积分变化）
    const supabase = createClient();
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_point_balance',
        },
        () => {
          // 积分变化时刷新排行榜
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <MiniLeaderboardSkeleton />;
  }

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            活跃榜 TOP3
          </span>
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              查看全部
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <m.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* 排名徽章 */}
              <div className="w-8 flex justify-center">
                {index === 0 ? (
                  <Crown className="w-6 h-6 text-amber-500" />
                ) : (
                  <Medal
                    className={`w-5 h-5 ${
                      index === 1 ? 'text-slate-400' : 'text-orange-400'
                    }`}
                  />
                )}
              </div>

              {/* 头像 */}
              <Avatar className="w-10 h-10 border-2 border-muted">
                <AvatarImage src={entry.avatarUrl || undefined} />
                <AvatarFallback className="text-sm">
                  {entry.name[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              {/* 用户名 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                  Lv.{entry.level}
                </p>
              </div>

              {/* 积分 */}
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="font-bold">{entry.totalPoints}</span>
              </div>
            </m.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 加载骨架屏
 */
function MiniLeaderboardSkeleton() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
