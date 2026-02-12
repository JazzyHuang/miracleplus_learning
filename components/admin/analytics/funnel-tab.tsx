'use client';

import { useCachedQuery } from '@/hooks/use-cached-query';
import { createClient } from '@/lib/supabase/client';
import { createAnalyticsService } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/skeleton';

interface FunnelTabProps {
  days: number;
}

export function FunnelTab({ days }: FunnelTabProps) {
  const supabase = createClient();
  const service = createAnalyticsService(supabase);

  const { data, loading } = useCachedQuery(
    'analytics-funnel-' + days,
    () => service.getLearningFunnel(days),
    { ttl: 60000 },
  );

  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  const steps = data?.steps ?? [];

  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center text-sm text-muted-foreground">
        暂无漏斗数据
      </div>
    );
  }

  const maxCount = steps[0]?.count ?? 1;
  const firstCount = maxCount || 1;

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
      <h3 className="font-semibold text-sm">学习转化漏斗</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const barWidth = `${((step.count / maxCount) * 100).toFixed(1)}%`;
          const overallRate = ((step.count / firstCount) * 100).toFixed(1);
          const prevCount = i > 0 ? (steps[i - 1]?.count || 1) : 0;
          const stepRate = i > 0 ? ((step.count / prevCount) * 100).toFixed(1) : null;
          const opacity = 1 - (i / Math.max(steps.length - 1, 1)) * 0.7;
          const barColor = `rgba(123, 147, 212, ${opacity})`;

          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium w-28 shrink-0">{step.name}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{step.count.toLocaleString()}</span>
                  <span className="w-14 text-right">{overallRate}%</span>
                  {i > 0 && (
                    <span className="w-20 text-right text-[11px]">
                      vs上步 {stepRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-muted/30 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all"
                  style={{ width: barWidth, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
