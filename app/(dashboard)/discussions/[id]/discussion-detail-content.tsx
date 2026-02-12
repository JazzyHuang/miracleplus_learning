'use client';

import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Users, Eye, Pin, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LikeButton } from '@/components/common/like-button';
import { CommentSection } from '@/components/common/comment-section';
import { DiscussionJsonLd } from '@/components/seo/discussion-json-ld';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { cn } from '@/lib/utils';
import type { Discussion } from '@/types/database';

interface DiscussionDetailContentProps {
  discussion: Discussion;
}

/**
 * 讨论详情页内容组件
 */
export function DiscussionDetailContent({ discussion }: DiscussionDetailContentProps) {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* SEO Structured Data */}
      <DiscussionJsonLd discussion={discussion} />
      {/* 面包屑导航 */}
      <div className="mb-6">
        <Breadcrumb items={[
          { label: '讨论区', href: '/discussions' },
          { label: discussion.title },
        ]} />
      </div>

      {/* 话题内容 */}
      <Card
        className={cn(
          'border-0 shadow-lg overflow-hidden mb-8',
          discussion.is_pinned && 'ring-2 ring-warning/50',
          discussion.is_featured && 'bg-linear-to-br from-primary/10 to-transparent'
        )}
      >
        {/* 置顶/精选标记 */}
        {(discussion.is_pinned || discussion.is_featured) && (
          <div className="flex gap-2 px-6 py-2 bg-muted/50">
            {discussion.is_pinned && (
              <div className="flex items-center gap-1 text-sm text-warning">
                <Pin className="w-4 h-4" />
                置顶话题
              </div>
            )}
            {discussion.is_featured && (
              <div className="flex items-center gap-1 text-sm text-primary">
                <Star className="w-4 h-4" />
                精选话题
              </div>
            )}
          </div>
        )}

        <CardContent className="p-6">
          {/* 标题 */}
          <h1 className="text-2xl font-bold mb-4">{discussion.title}</h1>

          {/* 作者信息 */}
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarImage src={discussion.user?.avatar_url || undefined} />
              <AvatarFallback>
                {discussion.user?.name?.[0] || discussion.user?.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {discussion.user?.name || discussion.user?.email || '匿名用户'}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(discussion.created_at), 'yyyy年MM月dd日 HH:mm', {
                  locale: zhCN,
                })}
              </p>
            </div>
          </div>

          {/* 内容 */}
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="whitespace-pre-wrap">{discussion.content}</p>
          </div>

          {/* 标签 */}
          {discussion.tags && discussion.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {discussion.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 统计和操作 */}
          <div className="flex items-center gap-6 pt-4 border-t">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{discussion.participant_count} 人参与</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span>{discussion.view_count} 次浏览</span>
            </div>
            <div className="ml-auto">
              <LikeButton
                targetType="discussion"
                targetId={discussion.id}
                initialCount={discussion.like_count}
                size="md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 评论区 */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <CommentSection
            targetType="discussion"
            targetId={discussion.id}
            showTitle
          />
        </CardContent>
      </Card>
    </div>
  );
}
