'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DB } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

interface BookmarkButtonProps {
  targetType: 'course' | 'lesson' | 'tool' | 'case' | 'comparison';
  targetId: string;
  initialBookmarked?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  onBookmarkChange?: (bookmarked: boolean) => void;
}

/**
 * 通用收藏按钮 — 乐观更新，复用 LikeButton 模式
 */
export function BookmarkButton({
  targetType,
  targetId,
  initialBookmarked = false,
  size = 'sm',
  className,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const { user } = useUser();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  // 自动获取初始收藏状态（当未显式传入时）
  useEffect(() => {
    if (initialBookmarked || !user) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from(DB.user_bookmarks)
      .select('target_id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: any) => {
        if (!cancelled && data) setIsBookmarked(true);
      });
    return () => { cancelled = true; };
  }, [user, targetType, targetId, initialBookmarked]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (isLoading) return;

    const next = !isBookmarked;
    setIsBookmarked(next);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (next) {
        const { error } = await supabase.from(DB.user_bookmarks).insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
        });
        if (error && error.code !== '23505') {
          setIsBookmarked(!next);
          toast.error('收藏失败');
          return;
        }
      } else {
        const { error } = await supabase
          .from(DB.user_bookmarks)
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId);
        if (error) {
          setIsBookmarked(!next);
          toast.error('取消收藏失败');
          return;
        }
      }

      onBookmarkChange?.(next);
      toast.success(next ? '已收藏' : '已取消收藏');
    } catch (error) {
      logger.error('收藏操作失败:', error);
      setIsBookmarked(!next);
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isBookmarked ? '取消收藏' : '收藏'}
      aria-pressed={isBookmarked}
      className={cn(
        sizeClasses,
        'rounded-full transition-colors',
        isBookmarked
          ? 'text-primary hover:text-primary hover:bg-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
    >
      <Bookmark
        className={cn(iconSize, isBookmarked && 'fill-current')}
      />
    </Button>
  );
}
