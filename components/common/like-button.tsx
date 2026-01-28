'use client';

import { useState, useOptimistic } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Heart, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  /** 目标类型 */
  targetType: 'checkin' | 'submission' | 'comment' | 'note' | 'review';
  /** 目标 ID */
  targetId: string;
  /** 初始点赞数 */
  initialCount?: number;
  /** 当前用户是否已点赞 */
  initialLiked?: boolean;
  /** 图标类型 */
  iconType?: 'heart' | 'thumbsUp';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示计数 */
  showCount?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点赞成功回调 */
  onLikeChange?: (liked: boolean, count: number) => void;
}

/**
 * 通用点赞按钮组件
 * 
 * - 支持乐观更新
 * - 支持动画效果
 * - 支持多种目标类型
 */
export function LikeButton({
  targetType,
  targetId,
  initialCount = 0,
  initialLiked = false,
  iconType = 'heart',
  size = 'md',
  showCount = true,
  className,
  onLikeChange,
}: LikeButtonProps) {
  const { user } = useUser();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  // 乐观更新
  const [optimisticLiked, addOptimisticLike] = useOptimistic(
    isLiked,
    (_, newLiked: boolean) => newLiked
  );

  const handleClick = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (isLoading) return;

    const newLiked = !isLiked;
    const newCount = newLiked ? count + 1 : count - 1;

    // 乐观更新 UI
    addOptimisticLike(newLiked);
    setIsLiked(newLiked);
    setCount(newCount);

    setIsLoading(true);

    try {
      const supabase = createClient();

      if (newLiked) {
        // 添加点赞
        const { error } = await supabase.from('likes').insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
        });

        if (error) {
          // 回滚
          setIsLiked(!newLiked);
          setCount(count);
          if (error.code === '23505') {
            // 已经点赞过了
            setIsLiked(true);
            setCount(count);
          } else {
            toast.error('点赞失败');
          }
          return;
        }
      } else {
        // 取消点赞
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId);

        if (error) {
          // 回滚
          setIsLiked(!newLiked);
          setCount(count);
          toast.error('取消点赞失败');
          return;
        }
      }

      onLikeChange?.(newLiked, newCount);
    } catch (err) {
      // 回滚
      setIsLiked(!newLiked);
      setCount(count);
      toast.error('操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = iconType === 'heart' ? Heart : ThumbsUp;

  const sizeClasses = {
    sm: 'h-7 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-9 px-4 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'gap-1.5 transition-colors',
        sizeClasses[size],
        optimisticLiked
          ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
    >
      <m.div
        animate={
          optimisticLiked
            ? {
                scale: [1, 1.3, 1],
              }
            : {}
        }
        transition={{ duration: 0.2 }}
      >
        <Icon
          className={cn(
            iconSizes[size],
            optimisticLiked && 'fill-current'
          )}
        />
      </m.div>
      {showCount && (
        <AnimatePresence mode="wait">
          <m.span
            key={count}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
          >
            {count}
          </m.span>
        </AnimatePresence>
      )}
    </Button>
  );
}
