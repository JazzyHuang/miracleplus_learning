'use client';

import { useState, useOptimistic } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DB } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

interface LikeButtonProps {
  /** 目标类型 */
  targetType: 'checkin' | 'submission' | 'comment' | 'note' | 'review' | 'discussion' | 'ai_tool' | 'experience';
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
        const { error } = await supabase.from(DB.likes).insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
        });

        if (error) {
          if (error.code === '23505') {
            // 已经点赞过了 — 保持 liked 状态，不回滚
            setIsLiked(true);
            setCount(newCount);
          } else {
            // 回滚
            setIsLiked(!newLiked);
            setCount(count);
            toast.error('点赞失败');
          }
          return;
        }
      } else {
        // 取消点赞
        const { error } = await supabase
          .from(DB.likes)
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
    } catch (error) {
      // 回滚
      logger.error('点赞操作失败:', error);
      setIsLiked(!newLiked);
      setCount(count);
      toast.error('操作失败，请稍后重试');
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
      aria-label={`${optimisticLiked ? '取消点赞' : '点赞'}${showCount ? ` (${count})` : ''}`}
      aria-pressed={optimisticLiked}
      className={cn(
        'gap-1.5 transition-colors',
        sizeClasses[size],
        optimisticLiked
          ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
    >
      <div
        className={cn(
          'transition-transform',
          optimisticLiked && 'animate-like-pop'
        )}
        key={optimisticLiked ? 'liked' : 'unliked'}
      >
        <Icon
          className={cn(
            iconSizes[size],
            optimisticLiked && 'fill-current'
          )}
        />
      </div>
      {showCount && (
        <span
          key={count}
          className="transition-all"
        >
          {count}
        </span>
      )}
    </Button>
  );
}
