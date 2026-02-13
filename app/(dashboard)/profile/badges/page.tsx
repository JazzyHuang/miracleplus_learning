'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser, useUserLoading } from '@/contexts/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeCard } from '@/components/gamification/badge-card';
import { BadgeDetailModal } from '@/components/gamification/badge-detail-modal';
import {
  createBadgesService,
  BADGE_CATEGORIES,
  type BadgeProgress,
} from '@/lib/points';

/**
 * 勋章墙页面
 * - 进度追踪：每个徽章显示当前进度和进度环
 * - 即将解锁：高亮显示进度 >= 80% 的徽章
 * - 详情弹窗：点击任意徽章查看完整信息
 * - 未解锁徽章按进度降序排列
 */
export default function BadgesPage() {
  const router = useRouter();
  const { user } = useUser();
  const userLoading = useUserLoading();
  const [allProgress, setAllProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const supabase = createClient();
      const badgesService = createBadgesService(supabase);
      const progress = await badgesService.getBadgeProgress(user.id);
      setAllProgress(progress);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (userLoading || loading) return <BadgesSkeleton />;
  if (!user) { router.push('/login'); return null; }

  // 按类别分组
  const progressByCategory = allProgress.reduce((acc, bp) => {
    const cat = bp.badge.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(bp);
    return acc;
  }, {} as Record<string, BadgeProgress[]>);

  // 即将解锁的徽章（进度 >= 80%）
  const nearMissBadges = allProgress.filter(bp => bp.isNearMiss);

  // 统计
  const totalBadges = allProgress.length;
  const unlockedCount = allProgress.filter(bp => bp.isUnlocked).length;

  // 排序：已解锁在前，未解锁按进度降序
  const sortBadges = (badges: BadgeProgress[]) => {
    return [...badges].sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      return b.progressPercent - a.progressPercent;
    });
  };

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-up">
        {Object.entries(BADGE_CATEGORIES).map(([key, name]) => {
          const catBadges = progressByCategory[key] || [];
          const catUnlocked = catBadges.filter(bp => bp.isUnlocked).length;
          return (
            <Card key={key} className="border-0 shadow-md">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">
                  {catUnlocked}/{catBadges.length}
                </p>
                <p className="text-sm text-muted-foreground">{name}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 即将解锁区域 */}
      {nearMissBadges.length > 0 && (
        <div className="animate-fade-up animate-delay-100">
          <Card className="border-amber-500/20 bg-amber-500/5 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-amber-500" />
                即将解锁
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {nearMissBadges.map(bp => (
                  <BadgeCard
                    key={bp.badge.id}
                    badgeProgress={bp}
                    size="sm"
                    onClick={() => setSelectedBadge(bp)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 勋章列表 */}
      <div className="animate-fade-up animate-delay-200">
        <Tabs defaultValue={Object.keys(BADGE_CATEGORIES)[0]} className="space-y-4">
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {sortBadges(progressByCategory[categoryKey] || []).map(bp => (
                      <BadgeCard
                        key={bp.badge.id}
                        badgeProgress={bp}
                        onClick={() => setSelectedBadge(bp)}
                      />
                    ))}
                  </div>

                  {(progressByCategory[categoryKey] || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      该类别暂无勋章
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 徽章详情弹窗 */}
      <BadgeDetailModal
        badgeProgress={selectedBadge}
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </div>
  );
}

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
