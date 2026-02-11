'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { 
  CalendarDays, 
  BookOpen, 
  ArrowRight, 
  Sparkles, 
  Clock,
  TrendingUp,
  Zap,
  Target,
  Bot,
  MessageSquare,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useUser } from '@/contexts/user-context';
import { PointCard, StreakIndicator, EnergyBar, GrowthTree } from '@/components/gamification';
import { Progress } from '@/components/ui/progress';
import type { PointBalance, UserStreak, LeaderboardEntry } from '@/lib/points';

// 性能优化：动态导入非首屏关键组件，减少初始 JS Bundle
const MiniLeaderboard = dynamic(() => import('@/components/gamification/mini-leaderboard').then(m => ({ default: m.MiniLeaderboard })), {
  loading: () => <div className="h-40 rounded-xl bg-card border border-border/50 animate-pulse" />,
});
const WeeklyStars = dynamic(() => import('@/components/gamification/weekly-stars').then(m => ({ default: m.WeeklyStars })), {
  loading: () => <div className="h-40 rounded-xl bg-card border border-border/50 animate-pulse" />,
});
import { toast } from 'sonner';
import type { UserLearningStats } from '@/lib/supabase/queries';

interface TopGainer {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  weekly_points: number;
}

interface HomeContentProps {
  stats?: UserLearningStats | null;
  initialPointBalance?: PointBalance | null;
  initialTodayPoints?: number;
  initialStreak?: UserStreak | null;
  initialLeaderboardTop3?: LeaderboardEntry[];
  initialWeeklyGainers?: TopGainer[];
}

/**
 * Get time-based greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/**
 * Metric Card Component — 白色卡片 + 蓝色图标
 * 优化：从 Framer Motion 迁移到 CSS animation，零 JS 动画开销
 */
function MetricCard({ 
  label, 
  value, 
  unit, 
  icon: Icon, 
  trend,
  delay = 0 
}: { 
  label: string
  value: number | string
  unit?: string
  icon: React.ElementType
  trend?: number
  delay?: number
}) {
  return (
    <div
      className="group relative p-5 rounded-xl bg-card border border-border/50 shadow-theme-sm hover:shadow-theme-md hover:translate-y-[-2px] transition-all duration-300 animate-fade-up"
      style={{ '--animation-delay': `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-semibold text-card-foreground tracking-tight">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/**
 * Quick Access Card — 白色卡片 + hover 上浮增强
 * 优化：CSS animation 替代 Framer Motion
 */
function QuickAccessCard({
  title,
  description,
  icon: Icon,
  href,
  progress,
  progressLabel,
  delay = 0,
}: {
  title: string
  description: string
  icon: React.ElementType
  href: string
  progress: number
  progressLabel: string
  delay?: number
}) {
  return (
    <div
      className="animate-fade-up"
      style={{ '--animation-delay': `${delay}ms` } as React.CSSProperties}
    >
      <Link href={href}>
        <div className="group relative p-6 rounded-xl bg-card border border-border/50 shadow-theme-sm hover:shadow-theme-lg hover:translate-y-[-4px] transition-all duration-300 overflow-hidden">
          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
            </div>
            
            {/* Content */}
            <h3 className="text-lg font-medium text-card-foreground mb-1 tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            
            {/* Progress — use brand gradient */}
            <div className="space-y-2">
              <Progress value={progress} variant="brand" className="h-1" />
              <p className="text-xs text-muted-foreground">{progressLabel}</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * Home Content - Dashboard 首页
 * 
 * 优化：
 * - 所有 Framer Motion 动画迁移到 CSS animation（减少 ~30KB JS）
 * - 使用品牌渐变色增强视觉识别
 * - 改善 muted-foreground 对比度
 */
export function HomeContent({
  stats,
  initialPointBalance,
  initialTodayPoints,
  initialStreak,
  initialLeaderboardTop3,
  initialWeeklyGainers,
}: HomeContentProps) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const hasShownVerifiedToast = useRef(false);

  // Check for email verification success
  useEffect(() => {
    if (searchParams.get('verified') === 'true' && !hasShownVerifiedToast.current) {
      hasShownVerifiedToast.current = true;
      toast.success('邮箱验证成功！欢迎加入 Miracle Learning');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [searchParams]);

  // Calculate progress percentages
  const courseProgress = (() => {
    if (!stats || stats.totalLessons === 0) return 0;
    return Math.round((stats.completedLessons / stats.totalLessons) * 100);
  })();

  const workshopProgress = (() => {
    if (!stats || stats.totalWorkshops === 0) return 0;
    return Math.round((stats.workshopCheckins / stats.totalWorkshops) * 100);
  })();

  const greeting = getGreeting();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Header — 更大标题、更温暖的文案 */}
      <div className="relative animate-fade-up">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 gradient-brand rounded-2xl flex items-center justify-center shadow-theme-md animate-scale-in"
                style={{ '--animation-delay': '200ms' } as React.CSSProperties}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight leading-tight text-foreground">
                  <span className="text-foreground/60">{greeting}，</span>
                  <span className="text-foreground">{user?.name || '学员'}</span>
                </h1>
                <p className="text-foreground/50 text-sm mt-1">今天想学点什么新知识？</p>
              </div>
            </div>
          </div>
          
          {/* Streak Indicator */}
          <StreakIndicator initialStreak={initialStreak} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: '学习天数', value: stats?.learningDays ?? 0, unit: '天', icon: Clock },
          { label: '完成课时', value: stats?.completedLessons ?? 0, unit: '节', icon: BookOpen },
          { label: '测试正确率', value: stats?.quizAccuracy ?? 0, unit: '%', icon: Target },
          { label: '活动参与', value: stats?.workshopCheckins ?? 0, unit: '次', icon: CalendarDays },
        ].map((item, index) => (
          <MetricCard key={item.label} {...item} delay={index * 60} />
        ))}
      </div>

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {[
          {
            title: '线上课程',
            description: '系统学习创业知识，观看课程视频，完成章节测试',
            icon: BookOpen,
            href: '/courses',
            progress: courseProgress,
            progressLabel: stats ? `已完成 ${stats.completedLessons}/${stats.totalLessons} 课时` : '开始学习课程',
          },
          {
            title: 'Workshop 活动',
            description: '参与线下活动，上传现场打卡照片，记录学习足迹',
            icon: CalendarDays,
            href: '/workshop',
            progress: workshopProgress,
            progressLabel: stats ? `已打卡 ${stats.workshopCheckins} 次活动` : '开始探索活动',
          },
        ].map((item, index) => (
          <QuickAccessCard key={item.href} {...item} delay={(index + 4) * 60} />
        ))}
      </div>

      {/* Energy Bar & Growth Tree — 白色卡片 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="animate-fade-up rounded-xl bg-card border border-border/50 shadow-theme-sm p-5"
          style={{ '--animation-delay': '0.33s' } as React.CSSProperties}>
          <h3 className="text-sm font-medium text-card-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Workshop 能量槽
          </h3>
          <EnergyBar current={stats?.workshopCheckins ?? 0} total={6} size="sm" />
        </div>
        <div className="animate-fade-up rounded-xl bg-card border border-border/50 shadow-theme-sm p-5"
          style={{ '--animation-delay': '0.35s' } as React.CSSProperties}>
          <h3 className="text-sm font-medium text-card-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-success" /> AI 认知成长树
          </h3>
          <GrowthTree completedCourses={Math.min(stats?.completedLessons ?? 0, 6)} totalCourses={6} size="sm" />
        </div>
      </div>

      {/* Points & Leaderboard */}
      <div className="grid md:grid-cols-2 gap-6">
        <div
          className="animate-fade-up"
          style={{ '--animation-delay': '0.35s' } as React.CSSProperties}
        >
          <PointCard initialBalance={initialPointBalance} initialTodayPoints={initialTodayPoints} />
        </div>
        <div
          className="animate-fade-up"
          style={{ '--animation-delay': '0.4s' } as React.CSSProperties}
        >
          <MiniLeaderboard initialData={initialLeaderboardTop3} />
        </div>
        <div
          className="animate-fade-up lg:col-span-2"
          style={{ '--animation-delay': '0.45s' } as React.CSSProperties}
        >
          <WeeklyStars initialData={initialWeeklyGainers} />
        </div>
      </div>

      {/* Quick Links — 白色卡片 + 蓝色图标 */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up"
        style={{ '--animation-delay': '0.45s' } as React.CSSProperties}
      >
        {[
          { label: 'AI 工具', icon: Bot, href: '/ai-tools' },
          { label: '社区讨论', icon: MessageSquare, href: '/discussions' },
          { label: '排行榜', icon: Zap, href: '/leaderboard' },
          { label: '邀请好友', icon: Sparkles, href: '/invite' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-theme-sm hover:shadow-theme-md hover:translate-y-[-2px] transition-all duration-200">
              <div className="p-2 rounded-lg bg-primary/10">
                <item.icon className="w-4 h-4 text-primary group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm text-card-foreground group-hover:text-card-foreground transition-colors">{item.label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
