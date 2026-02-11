'use client';

import { Star, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { RPC } from '@/lib/db-tables';
import { useCachedQuery, seedCache } from '@/hooks/use-cached-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TopGainer {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  weekly_points: number;
}

interface WeeklyStarsProps {
  initialData?: TopGainer[];
}

const RANK_STYLES = [
  { bg: 'from-warning/10 to-warning/5', border: 'border-warning/20', badge: 'bg-warning text-white' },
  { bg: 'from-muted to-muted/50', border: 'border-border', badge: 'bg-muted-foreground text-white' },
  { bg: 'from-warning/10 to-warning/5', border: 'border-warning/20', badge: 'bg-warning text-white' },
];

/**
 * 本周之星 - 首页展示本周积分增长最多的 TOP3 用户
 */
export function WeeklyStars({ initialData }: WeeklyStarsProps) {
  // 服务端数据预填充缓存
  if (initialData !== undefined) {
    seedCache('weekly-top-gainers', initialData);
  }

  const { data: gainers, loading } = useCachedQuery<TopGainer[]>(
    'weekly-top-gainers',
    async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc(RPC.get_weekly_top_gainers);
      return (data as TopGainer[]) ?? [];
    },
    { ttl: 300000 } // 5 minute cache
  );

  if (loading || !gainers || gainers.length === 0) return null;

  return (
    <div
      className="rounded-xl bg-card border border-border/50 shadow-sm p-5 animate-fade-up"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-warning" />
        <h3 className="font-medium text-card-foreground text-sm">本周之星</h3>
      </div>

      <div className="space-y-2.5">
        {gainers.slice(0, 3).map((gainer, index) => {
          const style = RANK_STYLES[index] ?? RANK_STYLES[RANK_STYLES.length - 1] ?? RANK_STYLES[0];
          return (
            <div
              key={gainer.user_id}
              className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${style?.bg ?? ''} border ${style?.border ?? ''} animate-slide-in-left`}
              style={{ '--animation-delay': `${index * 100}ms` } as React.CSSProperties}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style?.badge ?? ''}`}>
                {index + 1}
              </span>
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={gainer.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {gainer.name?.[0] ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-card-foreground flex-1 truncate">
                {gainer.name ?? '匿名用户'}
              </span>
              <div className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span className="font-medium text-warning">+{gainer.weekly_points}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
