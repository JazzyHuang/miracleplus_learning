'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Check, CheckCircle2, Loader2, Star, Award } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { createCoursesService } from '@/lib/courses';
import { createBadgesService } from '@/lib/points/badges';
import { POINT_RULES } from '@/lib/points/config';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface LessonCompleteButtonProps {
  lessonId: string;
  courseId: string;
  /** 是否已完成 */
  isCompleted?: boolean;
  /** 完成后的回调 */
  onComplete?: () => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示积分 */
  showPoints?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 课时标记完成按钮
 * 
 * 优化：
 * - 移除 Framer Motion AnimatePresence，改用 CSS animation
 * - 使用品牌渐变色增强视觉识别
 * - 添加 confetti 庆祝效果
 */
export function LessonCompleteButton({
  lessonId,
  courseId,
  isCompleted = false,
  onComplete,
  size = 'md',
  showPoints = true,
  className,
}: LessonCompleteButtonProps) {
  const { user } = useUser();
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(isCompleted);
  const [completed, setCompleted] = useState(isCompleted);
  const [isPending, startTransition] = useTransition();
  const [showReward, setShowReward] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);

  const isComplete = completed || optimisticCompleted;
  const loading = isPending;

  const handleMarkComplete = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (isComplete || loading) return;

    startTransition(async () => {
      setOptimisticCompleted(true);

      try {
        const supabase = createClient();
        const coursesService = createCoursesService(supabase);
        
        const result = await coursesService.markLessonComplete(
          user.id,
          lessonId,
          courseId
        );

        if (!result.success) {
          setOptimisticCompleted(false);
          toast.error(result.error || '标记失败');
          return;
        }

        setCompleted(true);
        setEarnedPoints(result.pointsEarned);
        setMilestone(result.milestoneAchieved);
        setShowReward(true);

      if (result.milestoneAchieved) {
        const milestoneMessages: Record<string, string> = {
          '50_percent': '恭喜完成 50% 课程！额外获得 100 积分',
          '100_percent': '恭喜完成全部课程！额外获得 300 积分',
          'marathon': '马拉松挑战成功！额外获得 100 积分',
        };
        toast.success(milestoneMessages[result.milestoneAchieved] || '里程碑达成！');
      } else if (result.pointsEarned > 0) {
        toast.success(`+${result.pointsEarned} 积分`);
      }

      // 性能优化：badge 检查非阻塞化，先显示完成反馈，badge 结果异步到达
      const badgesService = createBadgesService(supabase);
      badgesService.checkAndUnlockBadges(user.id).then(unlockedBadges => {
        if (unlockedBadges.length > 0) {
          setTimeout(() => {
            unlockedBadges.forEach((badge) => {
              toast.success(
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏅</span>
                  <span>解锁勋章：{badge.name}</span>
                </div>
              );
            });
          }, 1000);
        }
      }).catch(err => {
        logger.error('勋章检查失败:', err);
      });

      setTimeout(() => setShowReward(false), 2500);

      onComplete?.();
    } catch (error) {
      logger.error('标记课时完成失败:', error);
      setOptimisticCompleted(false);
      toast.error('标记失败，请稍后重试');
    }
    });
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4',
    lg: 'h-10 px-5',
  };

  if (isComplete) {
    return (
      <div className={cn('relative', className)}>
        <Button
          variant="outline"
          size="sm"
          disabled
          className={cn(
            'text-success border-success/20 bg-success/10',
            sizeClasses[size]
          )}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          已完成
        </Button>

        {/* 积分奖励 — CSS animation */}
        {showReward && earnedPoints > 0 && (
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 text-amber-400 font-bold animate-celebrate-pop"
          >
            <Star className="w-4 h-4" />
            +{earnedPoints}
          </div>
        )}

        {/* 里程碑动画 */}
        {showReward && milestone && (
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-1 font-bold whitespace-nowrap gradient-text-brand animate-celebrate-pop"
            style={{ animationDelay: '150ms' }}
          >
            <Award className="w-4 h-4 text-primary" />
            里程碑！
          </div>
        )}

        {/* Confetti particles */}
        {showReward && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full animate-confetti-fall"
                style={{
                  left: `${(i - 3) * 12}px`,
                  animationDelay: `${i * 80}ms`,
                  backgroundColor: ['#3b82f6', '#1d4ed8', '#60a5fa', '#10b981', '#f59e0b', '#6366f1'][i],
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkComplete}
      disabled={loading}
      className={cn(
        'border-primary/30 hover:border-primary/60 hover:bg-primary/5',
        sizeClasses[size],
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Check className="w-4 h-4 mr-2" />
      )}
      {loading ? '标记中...' : '标记完成'}
      {showPoints && !loading && (
        <span className="ml-2 text-xs text-amber-400">+{POINT_RULES.LESSON_MARK_COMPLETE}</span>
      )}
    </Button>
  );
}
