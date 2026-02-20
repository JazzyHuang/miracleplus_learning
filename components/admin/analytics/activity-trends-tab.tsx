'use client';

import { useMemo } from 'react';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { createClient } from '@/lib/supabase/client';
import { createAnalyticsService } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Brush,
} from '@/components/charts';

interface ActivityTrendsTabProps {
  days: number;
}

const LINE_CONFIG = [
  { dataKey: 'dau', name: 'DAU', color: '#7B93D4' },
  { dataKey: 'learning_users', name: '学习', color: '#5B8DEF' },
  { dataKey: 'workshop_users', name: '活动', color: '#9B7FD4' },
  { dataKey: 'community_users', name: '社区', color: '#5FA87D' },
  { dataKey: 'ai_tool_users', name: 'AI工具', color: '#D4983A' },
] as const;

function formatDateTick(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}

export function ActivityTrendsTab({ days }: ActivityTrendsTabProps) {
  const supabase = createClient();
  const service = createAnalyticsService(supabase);

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    const s = start.toISOString().split('T')[0] ?? '';
    const e = today.toISOString().split('T')[0] ?? '';
    return { startDate: s, endDate: e };
  }, [days]);

  const { data, loading } = useCachedQuery(
    'analytics-trends-' + days,
    () => service.getActivityTrends(startDate, endDate),
    { ttl: 60000 },
  );

  if (loading || !data) {
    return <TrendsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Multi-line activity trends */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <h3 className="font-semibold mb-4 text-sm">活跃趋势</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="activity_date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={formatDateTick}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(d: string) => new Date(d).toLocaleDateString('zh-CN')}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {LINE_CONFIG.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
              <Brush
                dataKey="activity_date"
                height={28}
                stroke="hsl(var(--border))"
                tickFormatter={formatDateTick}
                fill="hsl(var(--card))"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* New users bar chart */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <h3 className="font-semibold mb-4 text-sm">每日新增用户</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="activity_date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={formatDateTick}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(d: string) => new Date(d).toLocaleDateString('zh-CN')}
              />
              <Bar dataKey="new_users" name="新增用户" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[400px] rounded-xl" />
      <Skeleton className="h-[200px] rounded-xl" />
    </div>
  );
}
