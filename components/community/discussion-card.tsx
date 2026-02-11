'use client';

import { memo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageCircle, Users, Eye, Pin, Star, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LikeButton } from '@/components/common/like-button';
import { cn } from '@/lib/utils';
import type { Discussion } from '@/types/database';

interface DiscussionCardProps {
  discussion: Discussion;
  className?: string;
}

/**
 * Discussion Card — 白色卡片内的讨论项
 */
// 性能优化：React.memo 防止列表项不必要的重渲染
export const DiscussionCard = memo(function DiscussionCard({ discussion, className }: DiscussionCardProps) {
  return (
    <Link href={`/discussions/${discussion.id}`}>
      <div
        className={cn(
          'group flex items-start gap-4 p-5 hover:bg-muted/30 transition-colors rounded-lg cv-auto',
          discussion.is_pinned && 'bg-warning/5',
          discussion.is_featured && 'bg-primary/[0.03]',
          className
        )}
      >
        {/* Avatar */}
        <Avatar className="w-10 h-10 border border-border shrink-0">
          <AvatarImage src={discussion.user?.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
            {discussion.user?.name?.[0] || discussion.user?.email?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-card-foreground truncate">
              {discussion.user?.name || discussion.user?.email || '匿名用户'}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(discussion.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
            </span>
            {/* Badges */}
            {discussion.is_pinned && (
              <Badge variant="warning" size="sm" className="gap-1">
                <Pin className="w-2.5 h-2.5" />
                置顶
              </Badge>
            )}
            {discussion.is_featured && (
              <Badge variant="info" size="sm" className="gap-1">
                <Star className="w-2.5 h-2.5" />
                精选
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-medium text-card-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {discussion.title}
          </h3>

          {/* Preview */}
          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
            {discussion.content}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {/* Tags */}
            {discussion.tags && discussion.tags.length > 0 && (
              <div className="flex gap-1">
                {discussion.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {discussion.participant_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {discussion.comment_count}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {discussion.view_count}
              </span>
              <div onClick={(e) => e.preventDefault()}>
                <LikeButton
                  targetType="discussion"
                  targetId={discussion.id}
                  initialCount={discussion.like_count}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-3 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
});

/**
 * Discussion Card Skeleton
 */
export function DiscussionCardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="flex gap-3">
          <div className="h-3 w-10 rounded bg-muted animate-pulse" />
          <div className="h-3 w-10 rounded bg-muted animate-pulse" />
          <div className="h-3 w-10 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
