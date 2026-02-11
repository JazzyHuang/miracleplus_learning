'use client';

import { m } from 'framer-motion';
import {
  FileText, Download, Share2, Star, Flame,
  BookOpen, Users, Sparkles, Award,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from '@/components/charts';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { Button } from '@/components/ui/button';
import { getUserLevel } from '@/lib/points/config';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';

interface ReportContentProps {
  userId: string;
  userName: string;
}

interface LearningAnalytics {
  // Radar chart dimensions (0-100 scale)
  learning: number;    // 课程完成度
  practice: number;    // Workshop参与
  social: number;      // 讨论互动
  tools: number;       // AI工具探索
  creation: number;    // 作品产出
  // Summary stats
  totalPoints: number;
  lessonsCompleted: number;
  workshopCheckins: number;
  discussionCount: number;
  toolExperiences: number;
  submissions: number;
  badgeCount: number;
  streakDays: number;
  // Timeline data
  monthlyPoints: Array<{ month: string; points: number }>;
}

/**
 * AI 认知报告内容
 * 
 * 展示用户的学习轨迹、技能雷达图、成长曲线等。
 * 未来可集成 @react-pdf/renderer 导出 PDF。
 */
export function ReportContent({ userId, userName }: ReportContentProps) {
  // Fetch comprehensive analytics
  const { data: analytics, loading } = useCachedQuery<LearningAnalytics>(
    `report-analytics-${userId}`,
    async () => {
      const supabase = createClient();

      // Parallel fetch all data
      const [
        pointsResult,
        lessonsResult,
        checkinsResult,
        discussionsResult,
        toolExpResult,
        submissionsResult,
        badgesResult,
        streakResult,
        monthlyResult,
      ] = await Promise.all([
        supabase.from(DB.user_point_balance).select('total_points').eq('user_id', userId).single(),
        supabase.from(DB.user_lesson_progress).select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_completed', true),
        supabase.from(DB.workshop_checkins).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from(DB.discussions).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from(DB.tool_experiences).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from(DB.workshop_submissions).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from(DB.user_badges).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from(DB.user_streaks).select('current_streak, longest_streak').eq('user_id', userId).single(),
        // Monthly points aggregation (last 6 months)
        supabase.from(DB.point_transactions)
          .select('points, created_at')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at'),
      ]);

      const totalPoints = pointsResult.data?.total_points ?? 0;
      const lessons = lessonsResult.count ?? 0;
      const checkins = checkinsResult.count ?? 0;
      const discussions = discussionsResult.count ?? 0;
      const toolExp = toolExpResult.count ?? 0;
      const subs = submissionsResult.count ?? 0;
      const badges = badgesResult.count ?? 0;
      const streak = streakResult.data?.longest_streak ?? 0;

      // Calculate radar scores (0-100 scale)
      const learning = Math.min(100, (lessons / 30) * 100);
      const practice = Math.min(100, (checkins / 6) * 100);
      const social = Math.min(100, (discussions / 20) * 100);
      const tools = Math.min(100, (toolExp / 15) * 100);
      const creation = Math.min(100, (subs / 5) * 100);

      // Aggregate monthly points
      const monthlyMap = new Map<string, number>();
      for (const t of monthlyResult.data ?? []) {
        const month = new Date(t.created_at).toLocaleDateString('zh-CN', { month: 'short' });
        monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + t.points);
      }
      const monthlyPoints = [...monthlyMap.entries()].map(([month, points]) => ({ month, points }));

      return {
        learning, practice, social, tools, creation,
        totalPoints, lessonsCompleted: lessons, workshopCheckins: checkins,
        discussionCount: discussions, toolExperiences: toolExp, submissions: subs,
        badgeCount: badges, streakDays: streak, monthlyPoints,
      };
    },
    { ttl: 60000 }
  );

  if (loading || !analytics) {
    return <div className="text-center py-20 text-muted-foreground">生成报告中...</div>;
  }

  const level = getUserLevel(analytics.totalPoints);
  const radarData = [
    { dimension: '学习', value: analytics.learning },
    { dimension: '实践', value: analytics.practice },
    { dimension: '社交', value: analytics.social },
    { dimension: '工具', value: analytics.tools },
    { dimension: '创作', value: analytics.creation },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex rounded-full bg-indigo-500/10 p-4 mb-2">
          <FileText className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">AI 认知报告</h1>
        <p className="text-muted-foreground">{userName} 的学习成长记录</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            level.level >= 3 ? 'bg-warning/10 text-warning' :
            level.level >= 2 ? 'bg-indigo-500/10 text-indigo-400' :
            'bg-secondary text-muted-foreground'
          }`}>
            {level.name}
          </span>
          <span className="text-sm text-muted-foreground">{analytics.totalPoints} 积分</span>
        </div>
      </m.div>

      {/* Stats summary */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { label: '完成课程', value: analytics.lessonsCompleted, icon: BookOpen, color: 'text-blue-400' },
          { label: 'Workshop', value: analytics.workshopCheckins, icon: Users, color: 'text-violet-400' },
          { label: '勋章', value: analytics.badgeCount, icon: Award, color: 'text-warning' },
          { label: '最长连续', value: `${analytics.streakDays}天`, icon: Flame, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
            <stat.icon className={`w-5 h-5 ${stat.color} shrink-0`} />
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-bold text-card-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </m.div>

      {/* Radar chart + Growth curve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skill Radar */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl bg-card border border-border/50 shadow-sm"
        >
          <h3 className="font-medium text-card-foreground mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            能力雷达图
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#52525b', fontSize: 10 }}
              />
              <Radar
                name="能力"
                dataKey="value"
                stroke="#818cf8"
                fill="#818cf8"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </m.div>

        {/* Growth curve */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-secondary border border-white/[0.06]"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            成长曲线
          </h3>
          {analytics.monthlyPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.monthlyPoints}>
                <defs>
                  <linearGradient id="gradientPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="points"
                  stroke="#818cf8"
                  fill="url(#gradientPoints)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              暂无数据
            </div>
          )}
        </m.div>
      </div>

      {/* Actions */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center gap-3"
      >
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => toast.info('PDF 导出功能即将上线')}
        >
          <Download className="w-4 h-4" />
          导出 PDF
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: `${userName}的AI认知报告`, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
              toast.success('链接已复制');
            }
          }}
        >
          <Share2 className="w-4 h-4" />
          分享报告
        </Button>
      </m.div>
    </div>
  );
}
