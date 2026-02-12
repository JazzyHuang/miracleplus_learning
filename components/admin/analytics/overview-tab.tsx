'use client';

import { Users, TrendingUp, Activity, BookOpen, BarChart3, UserPlus } from 'lucide-react';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { createClient } from '@/lib/supabase/client';
import { createAnalyticsService } from '@/lib/analytics';
import { BRAND_COLORS } from '@/lib/brand-colors';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from '@/components/charts';
import { AnalyticsKpiCard } from './analytics-kpi-card';

interface OverviewTabProps {
  days: number;
}

const LEVEL_LABELS: Record<number, string> = {
  0: '观察者',
  1: '学习者',
  2: '实践者',
  3: 'AI领航员',
};

export function OverviewTab({ days }: OverviewTabProps) {
  const supabase = createClient();
  const service = createAnalyticsService(supabase);
  const { data, loading } = useCachedQuery(
    'analytics-overview-' + days,
    () => service.getOverview(days),
    { ttl: 60000 },
  );

  if (loading || !data) {
    return <OverviewSkeleton />;
  }

  const stickiness = data.mau > 0
    ? (data.wau / data.mau * 100).toFixed(1) + '%'
    : '0%';

  const sparkline = data.dailyTrend.map((d) => ({ value: d.dau }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AnalyticsKpiCard
          label="总用户数"
          value={data.totalUsers}
          icon={Users}
        />
        <AnalyticsKpiCard
          label="日均活跃"
          value={data.dauAvg}
          previousValue={data.dauAvgPrev}
          icon={TrendingUp}
          trend={sparkline}
        />
        <AnalyticsKpiCard
          label="WAU/MAU 粘性"
          value={stickiness}
          icon={Activity}
        />
        <AnalyticsKpiCard
          label="课时完成"
          value={data.lessonsCompletedPeriod}
          previousValue={data.lessonsCompletedPrev}
          icon={BookOpen}
        />
        <AnalyticsKpiCard
          label="平均参与度"
          value={data.avgEngagementScore + '/100'}
          icon={BarChart3}
        />
        <AnalyticsKpiCard
          label="新增用户"
          value={data.newUsersPeriod}
          previousValue={data.newUsersPrev}
          icon={UserPlus}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Trend */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <h3 className="font-semibold mb-4 text-sm">日活跃用户趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND_COLORS.dark.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BRAND_COLORS.dark.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(d: string) =>
                    new Date(d).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                  }
                />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(d: string) => new Date(d).toLocaleDateString('zh-CN')}
                />
                <Area
                  type="monotone"
                  dataKey="dau"
                  name="DAU"
                  stroke={BRAND_COLORS.dark.primary}
                  fill="url(#dauGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Level Distribution */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <h3 className="font-semibold mb-4 text-sm">用户等级分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.levelDistribution} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="level"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => LEVEL_LABELS[v] ?? `Lv${v}`}
                />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v: number) => LEVEL_LABELS[v] ?? `等级 ${v}`}
                />
                <Bar dataKey="count" name="用户数" fill={BRAND_COLORS.dark.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    </div>
  );
}
