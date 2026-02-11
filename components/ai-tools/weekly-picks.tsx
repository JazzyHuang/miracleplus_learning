'use client';

import { Sparkles, Star, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { useCachedQuery } from '@/hooks/use-cached-query';

interface WeeklyPick {
  id: string;
  tool: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    avg_rating: number;
    pricing_type: string;
  } | null;
  reason: string | null;
}

/**
 * 每周推荐工具展示
 * 
 * 在 AI 工具首页顶部显示本周推荐的工具。
 * 数据源: weekly_picks 表 + getWeeklyPicks() 查询
 */
export function WeeklyPicks() {
  const { data: picks } = useCachedQuery<WeeklyPick[]>(
    'weekly-picks',
    async () => {
      const supabase = createClient();
      const weekStart = getWeekStart();
      const { data } = await supabase
        .from(DB.weekly_picks)
        .select(`
          id, reason,
          tool:${DB.ai_tools} (id, name, slug, description, avg_rating, pricing_type)
        `)
        .gte('week_start', weekStart.toISOString())
        .limit(3);
      return (data as unknown as WeeklyPick[]) ?? [];
    },
    { ttl: 3600000 } // 1 hour cache
  );

  if (!picks || picks.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-violet-500/5 to-purple-500/5 p-6 space-y-4 shadow-sm animate-fade-up"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-medium text-card-foreground">本周推荐</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {picks.map((pick, index) => {
          if (!pick.tool) return null;
          return (
            <Link key={pick.id} href={`/ai-tools/${pick.tool.slug}`}>
              <div
                className="group p-4 rounded-xl bg-muted border border-border/50 hover:border-primary/30 transition-all duration-200 shadow-sm animate-fade-up"
                style={{ '--animation-delay': `${index * 100}ms` } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-card-foreground group-hover:text-primary transition-colors">
                    {pick.tool.name}
                  </h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0" />
                </div>
                {pick.tool.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{pick.tool.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="text-xs text-muted-foreground">{pick.tool.avg_rating?.toFixed(1) || '-'}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    pick.tool.pricing_type === 'free' ? 'bg-success/10 text-success' :
                    pick.tool.pricing_type === 'freemium' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {pick.tool.pricing_type === 'free' ? '免费' :
                     pick.tool.pricing_type === 'freemium' ? '免费+付费' : '付费'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
