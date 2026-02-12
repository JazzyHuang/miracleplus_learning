'use client';

import { useMemo } from 'react';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { createClient } from '@/lib/supabase/client';
import { createAnalyticsService } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/skeleton';

interface CohortCell {
  retained: number;
  size: number;
}

export function RetentionTab() {
  const supabase = createClient();
  const service = createAnalyticsService(supabase);

  const { data, loading } = useCachedQuery(
    'analytics-retention',
    () => service.getCohortRetention(),
    { ttl: 60000 },
  );

  const { cohortMonths, maxOffset, cohortMap } = useMemo(() => {
    if (!data || data.length === 0) {
      return { cohortMonths: [] as string[], maxOffset: 0, cohortMap: new Map<string, Map<number, CohortCell>>() };
    }

    const map = new Map<string, Map<number, CohortCell>>();
    let max = 0;

    for (const row of data) {
      if (!map.has(row.cohort_month)) {
        map.set(row.cohort_month, new Map());
      }
      const monthMap = map.get(row.cohort_month);
      monthMap?.set(row.month_offset, {
        retained: row.retained_users,
        size: row.cohort_size,
      });
      if (row.month_offset > max) max = row.month_offset;
    }

    return {
      cohortMonths: Array.from(map.keys()).sort(),
      maxOffset: max,
      cohortMap: map,
    };
  }, [data]);

  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (cohortMonths.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center text-sm text-muted-foreground">
        暂无留存数据
      </div>
    );
  }

  const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          按注册月份分组，展示用户在后续每个月的留存情况
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>低</span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background: 'linear-gradient(to right, transparent, rgb(34 197 94 / 0.6))',
            }}
          />
          <span>高</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  注册月份
                </th>
                {offsets.map((o) => (
                  <th
                    key={o}
                    className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap"
                  >
                    M{o}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortMonths.map((month) => {
                const cells = cohortMap.get(month);
                const m0 = cells?.get(0);
                const cohortSize = m0?.size ?? 0;
                const label = formatCohortMonth(month);

                return (
                  <tr key={month} className="border-t border-border/30">
                    <td className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      {label}
                      <span className="ml-1 text-muted-foreground">({cohortSize})</span>
                    </td>
                    {offsets.map((o) => {
                      const cell = cells?.get(o);
                      if (!cell || cohortSize < 3) {
                        return (
                          <td key={o} className="px-3 py-2 text-center text-muted-foreground">
                            &mdash;
                          </td>
                        );
                      }
                      const rate = cell.retained / cell.size;
                      const pct = (rate * 100).toFixed(1);
                      return (
                        <td
                          key={o}
                          className="px-3 py-2 text-center"
                          style={{ backgroundColor: `rgba(34, 197, 94, ${rate * 0.6})` }}
                          title={`${label}注册用户，第${o}个月留存 ${pct}% (${cell.retained}/${cell.size}人)`}
                        >
                          <span className={rate > 0.3 ? 'text-white' : 'text-muted-foreground'}>
                            {pct}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatCohortMonth(iso: string): string {
  const [year, month] = iso.split('-');
  return `${year}年${parseInt(month ?? '0', 10)}月`;
}
