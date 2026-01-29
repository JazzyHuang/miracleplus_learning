'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowLeft, Award, Lock, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createBadgesService,
  getBadgeTierInfo,
  BADGE_CATEGORIES,
  type Badge,
  type UserBadge,
} from '@/lib/points';

/**
 * 勋章墙页面
 * 展示所有勋章及用户解锁状态
 */
export default function BadgesPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const supabase = createClient();
      const badgesService = createBadgesService(supabase);

      const [badges, unlocked] = await Promise.all([
        badgesService.getAllBadges(),
        badgesService.getUserBadges(user.id),
      ]);

      setAllBadges(badges);
      setUserBadges(unlocked);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (userLoading || loading) {
    return <BadgesSkeleton />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // 按类别分组勋章
  const badgesByCategory = allBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category]!.push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  // 创建已解锁勋章的 Set
  const unlockedBadgeIds = new Set(userBadges.map((ub) => ub.badge.id));

  // 统计
  const totalBadges = allBadges.length;
  const unlockedCount = userBadges.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/profile')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold">勋章墙</h1>
          <p className="text-muted-foreground">
            已解锁 {unlockedCount}/{totalBadges} 枚勋章
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {Object.entries(BADGE_CATEGORIES).map(([key, name]) => {
          const categoryBadges = badgesByCategory[key] || [];
          const categoryUnlocked = categoryBadges.filter((b) =>
            unlockedBadgeIds.has(b.id)
          ).length;
          return (
            <Card key={key} className="border-0 shadow-md">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">
                  {categoryUnlocked}/{categoryBadges.length}
                </p>
                <p className="text-sm text-muted-foreground">{name}</p>
              </CardContent>
            </Card>
          );
        })}
      </m.div>

      {/* 勋章列表 */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs
          defaultValue={Object.keys(BADGE_CATEGORIES)[0]}
          className="space-y-4"
        >
          <TabsList className="flex-wrap h-auto gap-2 p-2">
            {Object.entries(BADGE_CATEGORIES).map(([key, name]) => (
              <TabsTrigger key={key} value={key} className="px-4">
                {name}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(BADGE_CATEGORIES).map(([categoryKey, categoryName]) => (
            <TabsContent key={categoryKey} value={categoryKey}>
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>{categoryName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {(badgesByCategory[categoryKey] || []).map((badge) => {
                      const isUnlocked = unlockedBadgeIds.has(badge.id);
                      const userBadge = userBadges.find(
                        (ub) => ub.badge.id === badge.id
                      );
                      const tierInfo = getBadgeTierInfo(badge.tier);

                      return (
                        <m.div
                          key={badge.id}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            isUnlocked
                              ? 'border-primary/20 bg-primary/5'
                              : 'border-muted bg-muted/30 opacity-60'
                          }`}
                          whileHover={{ scale: isUnlocked ? 1.02 : 1 }}
                        >
                          {/* 勋章图标 */}
                          <div className="flex justify-center mb-3">
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                isUnlocked
                                  ? badge.tier === 3
                                    ? 'bg-linear-to-br from-amber-400 to-yellow-500'
                                    : badge.tier === 2
                                    ? 'bg-linear-to-br from-slate-300 to-gray-400'
                                    : 'bg-linear-to-br from-orange-300 to-amber-400'
                                  : 'bg-muted'
                              }`}
                            >
                              {isUnlocked ? (
                                <Award className="w-8 h-8 text-white" />
                              ) : (
                                <Lock className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* 勋章信息 */}
                          <div className="text-center">
                            <p className="font-medium">{badge.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {badge.description}
                            </p>

                            {/* 等级标签 */}
                            <BadgeUI
                              variant="outline"
                              className="mt-2"
                              style={{
                                borderColor: isUnlocked
                                  ? tierInfo.color
                                  : undefined,
                                color: isUnlocked ? tierInfo.color : undefined,
                              }}
                            >
                              {tierInfo.name}级
                            </BadgeUI>

                            {/* 解锁时间 */}
                            {userBadge && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                                <Check className="w-3 h-3 text-green-500" />
                                {format(
                                  new Date(userBadge.unlockedAt),
                                  'yyyy/MM/dd',
                                  { locale: zhCN }
                                )}
                              </p>
                            )}

                            {/* 奖励积分 */}
                            {badge.pointsReward > 0 && (
                              <p className="text-xs text-amber-500 mt-1">
                                +{badge.pointsReward} 积分
                              </p>
                            )}
                          </div>
                        </m.div>
                      );
                    })}
                  </div>

                  {(badgesByCategory[categoryKey] || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      该类别暂无勋章
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </m.div>
    </div>
  );
}

/**
 * 加载骨架屏
 */
function BadgesSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
