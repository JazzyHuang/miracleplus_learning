'use client';

import { BarChart3, Users, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from '@/components/charts';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { BRAND_COLORS } from '@/lib/brand-colors';
import { DB } from '@/lib/db-tables';

interface AnalyticsData {
  totalUsers: number;
  activeUsers7d: number;
  courseCompletionRate: number;
  workshopParticipationRate: number;
  badgeAcquisitionRate: number;
  dailyActiveData: Array<{ date: string; count: number }>;
  pointDistribution: Array<{ level: string; count: number }>;
}

export default function AdminAnalyticsPage() {
  const supabase = createClient();

  const { data: analytics, loading: _loading } = useCachedQuery<AnalyticsData>(
    'admin-analytics',
    async () => {
      const [usersResult, activeResult, progressResult, checkinsResult, badgesResult, dailyResult, levelResult] = await Promise.all([
        supabase.from(DB.users).select('id', { count: 'exact', head: true }),
        supabase.from(DB.point_transactions).select('user_id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from(DB.user_lesson_progress).select('id', { count: 'exact', head: true }).eq('is_completed', true),
        supabase.from(DB.workshop_checkins).select('id', { count: 'exact', head: true }),
        supabase.from(DB.user_badges).select('id', { count: 'exact', head: true }),
        // Daily active users for last 14 days
        supabase.from(DB.point_transactions)
          .select('created_at, user_id')
          .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
          .order('created_at'),
        supabase.from(DB.user_point_balance).select('level'),
      ]);

      const totalUsers = usersResult.count ?? 0;
      const activeUsers7d = activeResult.count ?? 0;

      // Aggregate daily active data
      const dailyMap = new Map<string, Set<string>>();
      for (const t of dailyResult.data ?? []) {
        const date = new Date(t.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
        if (!dailyMap.has(date)) dailyMap.set(date, new Set());
        const userSet = dailyMap.get(date);
        userSet?.add(t.user_id);
      }
      const dailyActiveData = [...dailyMap.entries()].map(([date, users]) => ({ date, count: users.size }));

      // Level distribution
      const levelCounts = { 1: 0, 2: 0, 3: 0 };
      for (const row of levelResult.data ?? []) {
        const lvl = row.level as keyof typeof levelCounts;
        if (lvl in levelCounts) levelCounts[lvl]++;
      }
      const pointDistribution = [
        { level: 'AI 观察员', count: levelCounts[1] },
        { level: 'AI 实践家', count: levelCounts[2] },
        { level: 'AI 领航员', count: levelCounts[3] },
      ];

      return {
        totalUsers,
        activeUsers7d,
        courseCompletionRate: totalUsers > 0 ? Math.round(((progressResult.count ?? 0) / Math.max(totalUsers, 1)) * 100) : 0,
        workshopParticipationRate: totalUsers > 0 ? Math.round(((checkinsResult.count ?? 0) / Math.max(totalUsers, 1)) * 100) : 0,
        badgeAcquisitionRate: totalUsers > 0 ? Math.round(((badgesResult.count ?? 0) / Math.max(totalUsers, 1)) * 100) : 0,
        dailyActiveData,
        pointDistribution,
      };
    },
    { ttl: 60000 }
  );

  const metrics = analytics ? [
    { label: '总用户数', value: analytics.totalUsers, icon: Users, color: 'text-primary' },
    { label: '7日活跃', value: analytics.activeUsers7d, icon: TrendingUp, color: 'text-success' },
    { label: '课程完成率', value: `${analytics.courseCompletionRate}%`, icon: BookOpen, color: 'text-primary' },
    { label: 'Workshop参与率', value: `${analytics.workshopParticipationRate}%`, icon: Calendar, color: 'text-warning' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> 运营数据</h1>
        <p className="text-sm text-muted-foreground mt-1">平台核心运营指标</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-5 h-5 ${m.color}`} />
              <span className="text-sm text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-3xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Trend */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-4">日活趋势 (14天)</h3>
          {analytics && analytics.dailyActiveData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.dailyActiveData}>
                <defs>
                  <linearGradient id="gradientActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND_COLORS.light.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BRAND_COLORS.light.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke={BRAND_COLORS.light.primary} fill="url(#gradientActive)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </div>

        {/* Level Distribution */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-4">等级分布</h3>
          {analytics && analytics.pointDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.pointDistribution}>
                <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={BRAND_COLORS.light.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
