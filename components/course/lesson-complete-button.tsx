'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle2, Loader2, Star, Award } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { createCoursesService } from '@/lib/courses';
import { createBadgesService } from '@/lib/points/badges';
import { cn } from '@/lib/utils';

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
 * 用于飞书跳转模式下，用户返回站内后手动标记课时完成
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
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);

  const handleMarkComplete = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (completed || loading) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const coursesService = createCoursesService(supabase);
      
      const result = await coursesService.markLessonComplete(
        user.id,
        lessonId,
        courseId
      );

      if (!result.success) {
        toast.error(result.error || '标记失败');
        return;
      }

      setCompleted(true);
      setEarnedPoints(result.pointsEarned);
      setMilestone(result.milestoneAchieved);
      setShowReward(true);

      // 显示奖励通知
      if (result.milestoneAchieved) {
        const milestoneMessages: Record<string, string> = {
          '50_percent': '🎉 恭喜完成 50% 课程！额外获得 100 积分',
          '100_percent': '🏆 恭喜完成全部课程！额外获得 300 积分',
          'marathon': '🔥 马拉松挑战成功！额外获得 100 积分',
        };
        toast.success(milestoneMessages[result.milestoneAchieved] || '里程碑达成！');
      } else if (result.pointsEarned > 0) {
        toast.success(`+${result.pointsEarned} 积分`);
      }

      // 检查并解锁勋章
      const badgesService = createBadgesService(supabase);
      const unlockedBadges = await badgesService.checkAndUnlockBadges(user.id);
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

      // 延迟隐藏奖励动画
      setTimeout(() => setShowReward(false), 2000);

      onComplete?.();
    } catch (err) {
      toast.error('标记失败');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4',
    lg: 'h-10 px-5',
  };

  if (completed) {
    return (
      <div className={cn('relative', className)}>
        <Button
          variant="outline"
          size="sm"
          disabled
          className={cn(
            'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20',
            sizeClasses[size]
          )}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          已完成
        </Button>

        {/* 奖励动画 */}
        <AnimatePresence>
          {showReward && earnedPoints > 0 && (
            <m.div
              className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 text-amber-500 font-bold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Star className="w-4 h-4" />
              +{earnedPoints}
            </m.div>
          )}
        </AnimatePresence>

        {/* 里程碑动画 */}
        <AnimatePresence>
          {showReward && milestone && (
            <m.div
              className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-1 text-violet-500 font-bold whitespace-nowrap"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Award className="w-4 h-4" />
              里程碑！
            </m.div>
          )}
        </AnimatePresence>
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
        'border-primary/30 hover:border-primary hover:bg-primary/5',
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
        <span className="ml-2 text-xs text-amber-500">+50</span>
      )}
    </Button>
  );
}
