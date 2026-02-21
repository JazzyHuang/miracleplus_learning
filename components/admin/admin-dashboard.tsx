'use client';

import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  Users,
  FileText,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  UserPlus,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AdminDashboardData } from '@/lib/supabase/queries';

// Action type labels and colors for recent activity
const actionLabels: Record<string, string> = {
  CREATE: '创建', UPDATE: '更新', DELETE: '删除',
  PUBLISH: '发布', UNPUBLISH: '取消发布',
  APPROVE: '通过', REJECT: '拒绝',
  ADJUST_POINTS: '调分', EXPORT: '导出',
  ROLE_CHANGE: '角色变更',
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-400',
  UPDATE: 'bg-blue-500/15 text-blue-400',
  DELETE: 'bg-red-500/15 text-red-400',
  PUBLISH: 'bg-violet-500/15 text-violet-400',
  APPROVE: 'bg-amber-500/15 text-amber-400',
  REJECT: 'bg-amber-500/15 text-amber-400',
};

const resourceLabels: Record<string, string> = {
  course: '课程', chapter: '章节', lesson: '课时', question: '题目',
  workshop: '活动', user: '用户', article: '文章', reward: '商品',
  instructor_application: '讲师申请', ai_tool: 'AI工具',
  experience: '体验', case: '案例', submission: '作品',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

interface AdminDashboardProps {
  data: AdminDashboardData;
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const { stats, pending, recentLogs, newUsersThisWeek } = data;

  const statCards = [
    { label: '用户总数', value: stats.users, icon: Users, href: '/admin/users' },
    { label: '本周新增', value: newUsersThisWeek, icon: UserPlus, href: '/admin/users' },
    { label: '课程数', value: stats.courses, icon: BookOpen, href: '/admin/courses' },
    { label: '活动数', value: stats.workshops, icon: CalendarDays, href: '/admin/workshops' },
    { label: '课时数', value: stats.lessons, icon: FileText, href: '/admin/courses' },
  ];

  const pendingItems = [
    { label: '待审核内容', count: pending.moderation, icon: ShieldCheck, href: '/admin/moderation' },
    { label: '待审讲师申请', count: pending.instructors, icon: UserCheck, href: '/admin/instructors' },
    { label: '待处理订单', count: pending.orders, icon: ShoppingBag, href: '/admin/rewards' },
  ];

  const quickActions = [
    { label: '管理课程', desc: '创建、编辑和管理课程内容', href: '/admin/courses', icon: BookOpen },
    { label: '管理活动', desc: '创建和管理 Workshop 活动', href: '/admin/workshops', icon: CalendarDays },
    { label: 'AI 工具', desc: '管理 AI 工具目录和分类', href: '/admin/ai-tools', icon: Sparkles },
    { label: '运营数据', desc: '查看用户活跃度和学习数据', href: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">管理后台</h1>
        <p className="text-muted-foreground mt-1">管理课程、活动和平台内容</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border border-border shadow-soft hover:shadow-medium hover:border-foreground/20 transition-all duration-200 group">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value.toLocaleString('zh-CN')}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pending Queue + Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Queue */}
        <Card className="border border-border shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">待办事项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.count > 0 ? (
                    <Badge variant="destructive" className="text-xs">{item.count}</Badge>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-border shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">最近操作</CardTitle>
              <Link href="/admin/audit-logs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                查看全部
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">暂无操作记录</p>
            ) : (
              <div className="space-y-1">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 py-2">
                    <Badge variant="secondary" className={`text-[10px] shrink-0 mt-0.5 ${actionColors[log.action_type] || ''}`}>
                      {actionLabels[log.action_type] || log.action_type}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground/80 truncate">
                        {log.description || `${resourceLabels[log.resource_type] || log.resource_type}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {log.admin?.name || log.admin?.email || '管理员'} · {relativeTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">快捷操作</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="border border-border shadow-soft hover:shadow-medium hover:border-foreground/20 transition-all duration-200 group cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
