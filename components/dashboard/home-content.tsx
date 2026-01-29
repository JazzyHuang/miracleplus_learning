'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CalendarDays, BookOpen, ArrowRight, Sparkles, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-context';
import { MiniLeaderboard, PointCard, StreakIndicator } from '@/components/gamification';
import { toast } from 'sonner';
import type { UserLearningStats } from '@/lib/supabase/queries';

interface HomeContentProps {
  /** 用户学习统计数据（从服务端传入） */
  stats?: UserLearningStats | null;
}

/**
 * 首页内容组件
 *
 * Phase 6 改进：使用真实的学习统计数据
 */
export function HomeContent({ stats }: HomeContentProps) {
  // Use user from context - already fetched in layout, no duplicate request
  const { user } = useUser();
  const searchParams = useSearchParams();
  const hasShownVerifiedToast = useRef(false);

  // 检查邮箱验证成功参数
  useEffect(() => {
    if (searchParams.get('verified') === 'true' && !hasShownVerifiedToast.current) {
      hasShownVerifiedToast.current = true;
      toast.success('邮箱验证成功！欢迎加入 Miracle Learning');
      // 清除 URL 参数，避免刷新时重复显示
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  // 计算课程进度百分比
  const courseProgress = stats && stats.totalLessons > 0
    ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
    : 0;

  // 计算活动进度百分比
  const workshopProgress = stats && stats.totalWorkshops > 0
    ? Math.round((stats.workshopCheckins / stats.totalWorkshops) * 100)
    : 0;

  const features = [
    {
      title: 'Workshop 活动',
      description: '参与线下活动，上传现场打卡照片，记录学习足迹',
      icon: CalendarDays,
      href: '/workshop',
      progress: `${workshopProgress}%`,
      progressLabel: stats 
        ? `已打卡 ${stats.workshopCheckins} 次活动`
        : '开始探索活动',
    },
    {
      title: '线上资源',
      description: '系统学习创业知识，观看课程视频，完成章节测试',
      icon: BookOpen,
      href: '/courses',
      progress: `${courseProgress}%`,
      progressLabel: stats
        ? `已完成 ${stats.completedLessons}/${stats.totalLessons} 课时`
        : '开始学习课程',
    },
  ];
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                欢迎回来，{user?.name || '学员'}
              </h1>
              <p className="text-muted-foreground mt-1">
                开始你的创业学习之旅
              </p>
            </div>
          </div>
          
          {/* 右侧快捷操作 */}
          <div className="flex items-center gap-3">
            <StreakIndicator />
            <Link href="/profile">
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                个人中心
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <div 
            key={feature.title} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${(index + 1) * 100}ms` }}
          >
            <Link href={feature.href}>
              <Card className="group h-full border border-border hover:border-foreground/20 shadow-soft hover:shadow-medium transition-all duration-200 overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                    <feature.icon className="w-6 h-6 text-background" />
                  </div>
                  <CardTitle className="text-xl flex items-center justify-between">
                    {feature.title}
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
                  </CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full transition-all duration-700"
                      style={{ width: feature.progress }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {feature.progressLabel}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        ))}
      </div>

      {/* 积分卡片和排行榜 */}
      <div 
        className="mt-10 grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ animationDelay: '300ms' }}
      >
        {/* 积分卡片 */}
        <PointCard />
        
        {/* 迷你排行榜 */}
        <MiniLeaderboard />
      </div>

      {/* Quick Stats - Phase 6: 使用真实数据 */}
      <div 
        className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ animationDelay: '400ms' }}
      >
        <Card className="border border-border shadow-soft">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { 
                  label: '学习天数', 
                  value: stats?.learningDays ?? 0, 
                  unit: '天' 
                },
                { 
                  label: '完成课时', 
                  value: stats?.completedLessons ?? 0, 
                  unit: '节' 
                },
                { 
                  label: '测试正确率', 
                  value: stats?.quizAccuracy ?? 0, 
                  unit: '%' 
                },
                { 
                  label: '活动参与', 
                  value: stats?.workshopCheckins ?? 0, 
                  unit: '次' 
                },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-semibold text-foreground">
                    {stat.value}
                    <span className="text-lg font-normal text-muted-foreground ml-0.5">{stat.unit}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
