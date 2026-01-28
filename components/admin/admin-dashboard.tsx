'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, CalendarDays, Users, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  courses: number;
  workshops: number;
  users: number;
  lessons: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.12,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

interface AdminDashboardProps {
  stats: Stats;
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const statCards = [
    { label: '课程总数', value: stats.courses, icon: BookOpen, href: '/admin/courses' },
    { label: '活动总数', value: stats.workshops, icon: CalendarDays, href: '/admin/workshops' },
    { label: '用户总数', value: stats.users, icon: Users, href: '#' },
    { label: '课时总数', value: stats.lessons, icon: FileText, href: '/admin/courses' },
  ];

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto"
    >
      <m.div variants={itemVariants} className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">管理后台</h1>
        <p className="text-muted-foreground mt-1">管理课程、活动和平台内容</p>
      </m.div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((stat) => (
          <m.div key={stat.label} variants={itemVariants}>
            <Link href={stat.href}>
              <Card className="border border-border shadow-soft hover:shadow-medium hover:border-foreground/20 transition-all duration-200 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-semibold mt-1">{stat.value}</p>
                    </div>
                    <div className="w-11 h-11 bg-foreground rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <stat.icon className="w-5 h-5 text-background" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </m.div>
        ))}
      </div>

      {/* Quick Actions */}
      <m.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">快捷操作</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/admin/courses">
            <Card className="border border-border shadow-soft hover:shadow-medium hover:border-foreground/20 transition-all duration-200 group cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>管理课程</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  创建、编辑和管理所有课程内容，包括章节和课时
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/workshops">
            <Card className="border border-border shadow-soft hover:shadow-medium hover:border-foreground/20 transition-all duration-200 group cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>管理活动</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  创建和管理 Workshop 活动，查看打卡记录
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </m.div>
    </m.div>
  );
}
