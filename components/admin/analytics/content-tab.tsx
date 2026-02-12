'use client';

import { useState, useMemo } from 'react';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { createClient } from '@/lib/supabase/client';
import { createAnalyticsService } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ContentStats } from '@/lib/analytics';

type SortKey = 'enrollments' | 'completion' | 'time';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'enrollments', label: '按注册数' },
  { key: 'completion', label: '按完成率' },
  { key: 'time', label: '按平均时长' },
];

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '<1 分钟';
  return `${mins} 分钟`;
}

function sortData(data: ContentStats[], sortBy: SortKey): ContentStats[] {
  return [...data].sort((a, b) => {
    switch (sortBy) {
      case 'enrollments':
        return b.total_enrollments - a.total_enrollments;
      case 'completion':
        return b.completion_rate - a.completion_rate;
      case 'time':
        return b.avg_time_per_lesson - a.avg_time_per_lesson;
    }
  });
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ContentTab() {
  const [sortBy, setSortBy] = useState<SortKey>('enrollments');

  const supabase = createClient();
  const service = createAnalyticsService(supabase);

  const { data, loading } = useCachedQuery('analytics-content', () => service.getContentStats(), { ttl: 60000 });

  const sorted = useMemo(() => {
    if (!data) return [];
    return sortData(data, sortBy);
  }, [data, sortBy]);

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex items-center gap-1.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSortBy(opt.key)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border transition-colors',
              sortBy === opt.key
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">暂无课程数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">课程名</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">注册数</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">完成数</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">完成率</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">平均时长</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Q&amp;A</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">评价</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const rate = Math.round(row.completion_rate);
                  return (
                    <tr key={row.course_id} className="border-b border-border/30 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium truncate max-w-[200px] block">{row.course_title}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">{row.total_enrollments}</td>
                      <td className="px-4 py-3 text-xs">{row.total_completions}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-12">{rate}%</span>
                          <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatMinutes(row.avg_time_per_lesson)}</td>
                      <td className="px-4 py-3 text-xs">{row.total_questions}</td>
                      <td className="px-4 py-3 text-xs">{row.total_reviews}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
