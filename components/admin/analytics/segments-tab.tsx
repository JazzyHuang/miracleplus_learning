'use client';

import { useMemo } from 'react';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { createClient } from '@/lib/supabase/client';
import { createAnalyticsService } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BRAND_COLORS } from '@/lib/brand-colors';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from '@/components/charts';
import type { UserSegment } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEGMENT_LABELS: Record<string, string> = {
  power: '深度用户', active: '活跃用户', casual: '休闲用户',
  at_risk: '流失风险', churned: '已流失',
};

const SEGMENT_ORDER = ['power', 'active', 'casual', 'at_risk', 'churned'];

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

const SEGMENT_STYLES: Record<string, string> = {
  power: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  active: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  casual: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  at_risk: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  churned: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const SEGMENT_DEFINITIONS = [
  { segment: '深度用户', definition: '30天活跃≥15天，参与≥3类活动', action: '培养为社区领袖' },
  { segment: '活跃用户', definition: '30天活跃≥5天，行为≥15次', action: '引导深度参与' },
  { segment: '休闲用户', definition: '30天内有活动', action: '推送个性化内容' },
  { segment: '流失风险', definition: '60天内有活动但近30天无', action: '触发召回通知' },
  { segment: '已流失', definition: '60天+无活动', action: '邮件召回活动' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrderedSegments(segments: UserSegment[]): UserSegment[] {
  const map = new Map(segments.map((s) => [s.segment, s]));
  return SEGMENT_ORDER.map((key) => map.get(key)).filter(Boolean) as UserSegment[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SegmentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-12" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground">{item.value} 人</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SegmentsTab() {
  const supabase = createClient();
  const service = createAnalyticsService(supabase);

  const { data: segments, loading: segLoading } = useCachedQuery(
    'analytics-segments', () => service.getUserSegments(), { ttl: 60000 },
  );
  const { data: distribution, loading: distLoading } = useCachedQuery(
    'analytics-engagement-dist', () => service.getEngagementDistribution(), { ttl: 60000 },
  );
  const ordered = useMemo(() => (segments ? getOrderedSegments(segments) : []), [segments]);

  const pieData = useMemo(
    () => ordered.map((s) => ({ name: SEGMENT_LABELS[s.segment] ?? s.segment, value: s.user_count })),
    [ordered],
  );

  return (
    <div className="space-y-6">
      {/* Segment cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {segLoading
          ? Array.from({ length: 5 }).map((_, i) => <SegmentCardSkeleton key={i} />)
          : ordered.map((seg) => (
              <div
                key={seg.segment}
                className={cn(
                  'rounded-xl border p-4 space-y-1',
                  SEGMENT_STYLES[seg.segment] ?? 'bg-muted/15 text-muted-foreground border-border/50',
                )}
              >
                <p className="text-xs font-medium">{SEGMENT_LABELS[seg.segment] ?? seg.segment}</p>
                <p className="text-xl font-bold">{seg.user_count.toLocaleString('zh-CN')}</p>
                <p className="text-[11px] opacity-70">
                  参与度 {seg.avg_engagement_score.toFixed(1)}
                </p>
              </div>
            ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart - segment distribution */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
          <p className="text-sm font-medium">用户分群分布</p>
          {segLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar chart - engagement distribution */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
          <p className="text-sm font-medium">参与度分布</p>
          {distLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: BRAND_COLORS.dark.mutedForeground }} />
                  <YAxis tick={{ fontSize: 11, fill: BRAND_COLORS.dark.mutedForeground }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="用户数" fill={BRAND_COLORS.dark.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      {/* Segment definition table */}
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">分群</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">定义</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">建议运营动作</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENT_DEFINITIONS.map((row) => (
                <tr key={row.segment} className="border-b border-border/30 hover:bg-muted/40">
                  <td className="px-4 py-3 text-xs font-medium">{row.segment}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.definition}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
