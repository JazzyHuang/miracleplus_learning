'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Trophy,
  Flame,
  Star,
  Award,
  TrendingUp,
  Calendar,
  BookOpen,
  Target,
  ChevronRight,
  Edit2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createPointsService,
  createBadgesService,
  getUserLevel,
  getPointsToNextLevel,
  USER_LEVELS,
  type PointBalance,
  type UserStreak,
  type UserBadge,
  type PointTransaction,
} from '@/lib/points';
import { EditProfileDialog } from '@/components/profile';

interface ProfileContentProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar_url?: string | null;
  };
  initialPointBalance: PointBalance | null;
  initialStreak: UserStreak | null;
  initialBadges: UserBadge[];
  initialTransactions: PointTransaction[];
}

/**
 * 个人中心内容组件（客户端）
 * 接收服务端预获取的数据
 */
export function ProfileContent({
  user,
  initialPointBalance,
  initialStreak,
  initialBadges,
  initialTransactions,
}: ProfileContentProps) {
  const router = useRouter();
  const [pointBalance, setPointBalance] = useState<PointBalance | null>(initialPointBalance);
  const [streak, setStreak] = useState<UserStreak | null>(initialStreak);
  const [badges, setBadges] = useState<UserBadge[]>(initialBadges);
  const [recentTransactions, setRecentTransactions] = useState<PointTransaction[]>(initialTransactions);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const refreshData = useCallback(async () => {
    const supabase = createClient();
    const pointsService = createPointsService(supabase);
    const badgesService = createBadgesService(supabase);
    const [balance, userStreak, userBadges, transactions] = await Promise.all([
      pointsService.getPointBalance(user.id),
      pointsService.getUserStreak(user.id),
      badgesService.getUserBadges(user.id),
      pointsService.getPointTransactions(user.id, 10),
    ]);
    setPointBalance(balance);
    setStreak(userStreak);
    setBadges(userBadges);
    setRecentTransactions(transactions);
  }, [user.id]);

  const currentLevel = pointBalance ? getUserLevel(pointBalance.totalPoints) : USER_LEVELS[0];
  const pointsToNext = pointBalance ? getPointsToNextLevel(pointBalance.totalPoints) : null;
  const progressToNextLevel = pointsToNext !== null && currentLevel.maxPoints !== Infinity
    ? ((pointBalance?.totalPoints || 0) - currentLevel.minPoints) / (currentLevel.maxPoints - currentLevel.minPoints + 1) * 100
    : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 用户头部信息 */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          {/* 背景渐变 */}
          <div className="h-24 bg-linear-to-r from-primary/20 via-primary/10 to-transparent" />
          
          <CardContent className="relative pt-0 pb-6">
            {/* 头像 */}
            <div className="absolute -top-12 left-6">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {user.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* 用户信息 */}
            <div className="ml-32 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{user.name || '未设置昵称'}</h1>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  编辑资料
                </Button>
              </div>

              {/* 等级和积分 */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">等级</p>
                    <p className="font-bold">{currentLevel.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">积分</p>
                    <p className="font-bold">{pointBalance?.totalPoints || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-red-400 to-rose-500 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">连续登录</p>
                    <p className="font-bold">{streak?.currentStreak || 0} 天</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">勋章</p>
                    <p className="font-bold">{badges.length} 枚</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </m.div>

      {/* 等级进度 */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              成长进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{currentLevel.name}</span>
              {pointsToNext !== null && (
                <span className="text-sm text-muted-foreground">
                  距离下一级还需 {pointsToNext} 积分
                </span>
              )}
            </div>
            <Progress value={progressToNextLevel} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{currentLevel.minPoints}</span>
              {currentLevel.maxPoints !== Infinity && (
                <span>{currentLevel.maxPoints + 1}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </m.div>

      {/* 详细内容标签页 */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="badges" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="badges">
              <Award className="w-4 h-4 mr-2" />
              勋章墙
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Star className="w-4 h-4 mr-2" />
              积分明细
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Target className="w-4 h-4 mr-2" />
              学习统计
            </TabsTrigger>
          </TabsList>

          {/* 勋章墙 */}
          <TabsContent value="badges">
            <Card className="border-0 shadow-md">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">我的勋章</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/profile/badges')}
                >
                  查看全部
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">还没有获得勋章</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      完成学习任务即可解锁勋章
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                    {badges.slice(0, 12).map((userBadge) => (
                      <m.div
                        key={userBadge.badge.id}
                        className="flex flex-col items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center ${
                            userBadge.badge.tier === 3
                              ? 'bg-linear-to-br from-amber-400 to-yellow-500'
                              : userBadge.badge.tier === 2
                              ? 'bg-linear-to-br from-slate-300 to-gray-400'
                              : 'bg-linear-to-br from-orange-300 to-amber-400'
                          }`}
                        >
                          <Award className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-xs text-center truncate w-full">
                          {userBadge.badge.name}
                        </span>
                      </m.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 积分明细 */}
          <TabsContent value="transactions">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">最近积分记录</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">暂无积分记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {transaction.description || transaction.actionType}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'MM月dd日 HH:mm', {
                              locale: zhCN,
                            })}
                          </p>
                        </div>
                        <span
                          className={`font-bold ${
                            transaction.points > 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {transaction.points > 0 ? '+' : ''}
                          {transaction.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学习统计 */}
          <TabsContent value="stats">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">学习统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    icon={<Calendar className="w-5 h-5" />}
                    label="最长连续登录"
                    value={`${streak?.longestStreak || 0} 天`}
                    color="from-purple-400 to-violet-500"
                  />
                  <StatCard
                    icon={<Flame className="w-5 h-5" />}
                    label="当前连续登录"
                    value={`${streak?.currentStreak || 0} 天`}
                    color="from-red-400 to-rose-500"
                  />
                  <StatCard
                    icon={<BookOpen className="w-5 h-5" />}
                    label="已完成课时"
                    value="计算中..."
                    color="from-blue-400 to-cyan-500"
                  />
                  <StatCard
                    icon={<Trophy className="w-5 h-5" />}
                    label="累计积分"
                    value={`${pointBalance?.totalPoints || 0}`}
                    color="from-amber-400 to-orange-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </m.div>

      {/* 编辑资料对话框 */}
      <EditProfileDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}

/**
 * 统计卡片组件
 */
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      <div
        className={`w-10 h-10 rounded-full bg-linear-to-br ${color} flex items-center justify-center text-white`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-bold">{value}</p>
      </div>
    </div>
  );
}
