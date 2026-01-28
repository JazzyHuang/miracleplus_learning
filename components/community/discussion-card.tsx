'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageCircle, Users, Eye, Pin, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
 * 讨论话题卡片
 */
export function DiscussionCard({ discussion, className }: DiscussionCardProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/discussions/${discussion.id}`}>
        <Card
          className={cn(
            'border-0 shadow-md overflow-hidden transition-shadow hover:shadow-lg',
            discussion.is_pinned && 'ring-2 ring-amber-400/50',
            discussion.is_featured && 'bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20',
            className
          )}
        >
          {/* 置顶/精选标记 */}
          {(discussion.is_pinned || discussion.is_featured) && (
            <div className="flex gap-2 px-4 py-1.5 bg-muted/50">
              {discussion.is_pinned && (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Pin className="w-3 h-3" />
                  置顶
                </div>
              )}
              {discussion.is_featured && (
                <div className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
                  <Star className="w-3 h-3" />
                  精选
                </div>
              )}
            </div>
          )}

          <CardContent className="p-4">
            {/* 作者信息 */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={discussion.user?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {discussion.user?.name?.[0] || discussion.user?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {discussion.user?.name || discussion.user?.email || '匿名用户'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(discussion.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                </p>
              </div>
            </div>

            {/* 标题 */}
            <h3 className="font-bold text-lg mb-2 line-clamp-2">
              {discussion.title}
            </h3>

            {/* 内容预览 */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {discussion.content}
            </p>

            {/* 标签 */}
            {discussion.tags && discussion.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {discussion.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 统计信息 */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{discussion.participant_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{discussion.comment_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{discussion.view_count}</span>
              </div>
              <div className="ml-auto" onClick={(e) => e.preventDefault()}>
                <LikeButton
                  targetType="comment"
                  targetId={discussion.id}
                  initialCount={discussion.like_count}
                  size="sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </m.div>
  );
}

/**
 * 讨论卡片骨架屏
 */
export function DiscussionCardSkeleton() {
  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-1" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-3" />
        <div className="flex gap-4">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
