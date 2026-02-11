'use client';

import Link from 'next/link';
import { Trophy, Star, ChevronRight, Crown, Medal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPointsService, type LeaderboardEntry } from '@/lib/points';
import { useCachedQuery, seedCache } from '@/hooks/use-cached-query';

interface MiniLeaderboardProps {
  initialData?: LeaderboardEntry[];
}

/**
 * Mini Leaderboard — 白色卡片 + CSS 入场动画
 *
 * 优化：
 * - m.div 替换为 CSS animate-slide-in-left + animation-delay
 * - 保留 'use client' — 需要 useCachedQuery hook
 */
export function MiniLeaderboard({ initialData }: MiniLeaderboardProps) {
  // 服务端数据预填充缓存
  if (initialData !== undefined) {
    seedCache('mini-leaderboard', initialData);
  }

  const { data: leaderboard, loading, error } = useCachedQuery<LeaderboardEntry[]>(
    'mini-leaderboard',
    async () => {
      const supabase = createClient();
      const pointsService = createPointsService(supabase);
      return pointsService.getLeaderboard(3);
    },
    { ttl: 300000 }
  );

  if (loading && !leaderboard) {
    return <MiniLeaderboardSkeleton />;
  }

  if (error && !leaderboard) {
    return (
      <div className="relative p-6 rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
        <div className="text-center text-sm text-muted-foreground py-4">
          加载排行榜失败
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return <MiniLeaderboardSkeleton />;
  }

  return (
    <div className="relative p-6 rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="font-medium text-card-foreground">活跃榜 TOP3</h3>
          </div>
          <Link href="/leaderboard">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              查看全部
              <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* Leaderboard entries — CSS stagger animation */}
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors animate-slide-in-left"
              style={{
                '--animation-delay': `${index * 100}ms`,
              } as React.CSSProperties}
            >
              {/* Rank badge */}
              <div className="w-6 flex justify-center">
                {index === 0 ? (
                  <Crown className="w-5 h-5 text-warning" />
                ) : (
                  <Medal
                    className={`w-4 h-4 ${
                      index === 1 ? 'text-muted-foreground' : 'text-warning'
                    }`}
                  />
                )}
              </div>

              {/* Avatar */}
              <Avatar className="w-9 h-9 border border-border">
                <AvatarImage src={entry.avatarUrl || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  {entry.name[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-card-foreground truncate">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                  Lv.{entry.level}
                </p>
              </div>

              {/* Points */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10">
                <Star className="w-3 h-3 text-warning" />
                <span className="text-sm font-semibold text-warning">{entry.totalPoints}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton — 白色卡片骨架
 */
function MiniLeaderboardSkeleton() {
  return (
    <div className="relative p-6 rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-6 w-14 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
