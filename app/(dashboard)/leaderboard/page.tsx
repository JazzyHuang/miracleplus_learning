'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Trophy, Medal, Star, Flame, Award, Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createPointsService, type LeaderboardEntry } from '@/lib/points';

/**
 * 排行榜页面
 */
export default function LeaderboardPage() {
  const { user } = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const pointsService = createPointsService(supabase);

      const [entries, rank] = await Promise.all([
        pointsService.getLeaderboard(50),
        user ? pointsService.getUserRank(user.id) : Promise.resolve(null),
      ]);

      setLeaderboard(entries);
      setUserRank(rank);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  // 分离 TOP3 和其他
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">积分排行榜</h1>
        <p className="text-muted-foreground mt-1">
          看看谁是学习之星！
        </p>
        {userRank && (
          <Badge variant="secondary" className="mt-2">
            你当前排名第 {userRank} 名
          </Badge>
        )}
      </div>

      {/* TOP3 展示 */}
      {top3.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          {/* 第二名 */}
          {top3[1] && (
            <TopThreeCard entry={top3[1]} position={2} />
          )}
          
          {/* 第一名 - 居中且更大 */}
          {top3[0] && (
            <TopThreeCard entry={top3[0]} position={1} />
          )}
          
          {/* 第三名 */}
          {top3[2] && (
            <TopThreeCard entry={top3[2]} position={3} />
          )}
        </m.div>
      )}

      {/* 其他排名 */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              完整排名
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {leaderboard.map((entry, index) => (
                <m.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors ${
                    user?.id === entry.id ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* 排名 */}
                  <div className="w-8 text-center">
                    {entry.rank <= 3 ? (
                      <RankBadge rank={entry.rank} />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* 头像 */}
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback>
                      {entry.name[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* 用户信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{entry.name}</span>
                      {user?.id === entry.id && (
                        <Badge variant="secondary" className="text-xs">
                          我
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {entry.badgeCount} 勋章
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {entry.currentStreak} 天
                      </span>
                    </div>
                  </div>

                  {/* 积分 */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-lg">{entry.totalPoints}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">积分</span>
                  </div>
                </m.div>
              ))}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                暂无排行数据
              </div>
            )}
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
}

/**
 * TOP3 卡片组件
 */
function TopThreeCard({
  entry,
  position,
}: {
  entry: LeaderboardEntry;
  position: 1 | 2 | 3;
}) {
  const isFirst = position === 1;
  
  return (
    <m.div
      className={`relative ${isFirst ? 'order-2 -mt-4' : position === 2 ? 'order-1' : 'order-3'}`}
      whileHover={{ scale: 1.02 }}
    >
      <Card
        className={`border-0 shadow-lg text-center overflow-hidden ${
          isFirst ? 'bg-linear-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-background' : ''
        }`}
      >
        {/* 皇冠/奖牌 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          {isFirst ? (
            <Crown className="w-6 h-6 text-amber-500" />
          ) : (
            <Medal
              className={`w-5 h-5 ${
                position === 2 ? 'text-slate-400' : 'text-orange-400'
              }`}
            />
          )}
        </div>

        <CardContent className={`pt-10 ${isFirst ? 'pb-6' : 'pb-4'}`}>
          {/* 头像 */}
          <Avatar
            className={`mx-auto border-4 ${
              isFirst
                ? 'w-20 h-20 border-amber-400'
                : 'w-16 h-16 border-muted'
            }`}
          >
            <AvatarImage src={entry.avatarUrl || undefined} />
            <AvatarFallback className={isFirst ? 'text-xl' : ''}>
              {entry.name[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          {/* 名字 */}
          <p className={`font-bold mt-3 truncate ${isFirst ? 'text-lg' : ''}`}>
            {entry.name}
          </p>

          {/* 积分 */}
          <div className="flex items-center justify-center gap-1 mt-2">
            <Star className={`text-amber-500 ${isFirst ? 'w-5 h-5' : 'w-4 h-4'}`} />
            <span className={`font-bold ${isFirst ? 'text-2xl' : 'text-xl'}`}>
              {entry.totalPoints}
            </span>
          </div>

          {/* 连续登录 */}
          <div className="flex items-center justify-center gap-1 mt-1 text-sm text-muted-foreground">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>{entry.currentStreak} 天连续</span>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}

/**
 * 排名徽章
 */
function RankBadge({ rank }: { rank: number }) {
  const colors = {
    1: 'from-amber-400 to-yellow-500',
    2: 'from-slate-300 to-gray-400',
    3: 'from-orange-300 to-amber-400',
  };

  return (
    <div
      className={`w-8 h-8 rounded-full bg-linear-to-br ${
        colors[rank as keyof typeof colors]
      } flex items-center justify-center text-white font-bold text-sm`}
    >
      {rank}
    </div>
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
