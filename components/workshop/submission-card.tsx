'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Award,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LikeButton } from '@/components/common/like-button';
import { CommentSection } from '@/components/common/comment-section';
import { SubmissionForm } from './submission-form';
import { cn } from '@/lib/utils';
import type { User } from '@/types/database';

interface Submission {
  id: string;
  user_id: string;
  workshop_id: string;
  title: string;
  content_type: 'image' | 'document' | 'link' | 'text';
  content_url: string | null;
  content_text: string | null;
  description: string | null;
  tags: string[] | null;
  version: number;
  status: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  user: User;
}

interface SubmissionCardProps {
  submission: Submission;
  /** 是否为 TOP3 作品 */
  isTop3?: boolean;
  /** 排名（1, 2, 3） */
  rank?: number;
  /** 是否显示评论区 */
  showComments?: boolean;
  /** 当前用户 ID */
  currentUserId?: string;
  /** 刷新回调 */
  onRefresh?: () => void;
}

const contentTypeIcons = {
  image: ImageIcon,
  document: FileText,
  link: LinkIcon,
  text: FileText,
};

const contentTypeLabels = {
  image: '图片',
  document: '文档',
  link: '链接',
  text: '文本',
};

/**
 * 作品卡片组件
 */
export function SubmissionCard({
  submission,
  isTop3 = false,
  rank,
  showComments = false,
  currentUserId,
  onRefresh,
}: SubmissionCardProps) {
  const [expanded, setExpanded] = useState(showComments);
  const [showIterateForm, setShowIterateForm] = useState(false);
  
  const ContentIcon = contentTypeIcons[submission.content_type];
  const isOwner = currentUserId === submission.user_id;

  return (
    <>
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={cn(
            'border-0 shadow-md overflow-hidden transition-shadow hover:shadow-lg',
            isTop3 && 'ring-2 ring-amber-400/50',
            submission.status === 'featured' && 'bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20'
          )}
        >
          {/* TOP3 标记 */}
          {isTop3 && rank && (
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-4 py-1 text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4" />
              TOP {rank} 作品
            </div>
          )}

          {/* 精选标记 */}
          {submission.status === 'featured' && !isTop3 && (
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-4 py-1 text-sm font-medium">
              精选作品
            </div>
          )}

          <CardContent className="p-4">
            {/* 作者信息 */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={submission.user.avatar_url || undefined} />
                <AvatarFallback>
                  {submission.user.name?.[0] || submission.user.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {submission.user.name || submission.user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(submission.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                  {submission.version > 1 && (
                    <span className="ml-2 text-primary">v{submission.version}</span>
                  )}
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <ContentIcon className="w-3 h-3" />
                {contentTypeLabels[submission.content_type]}
              </Badge>
            </div>

            {/* 作品标题 */}
            <h3 className="font-bold text-lg mb-2">{submission.title}</h3>

            {/* 作品内容预览 */}
            {submission.content_type === 'image' && submission.content_url && (
              <div className="relative rounded-lg overflow-hidden bg-muted mb-3">
                <img
                  src={submission.content_url}
                  alt={submission.title}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            {submission.content_type === 'text' && submission.content_text && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {submission.content_text}
              </p>
            )}

            {(submission.content_type === 'link' || submission.content_type === 'document') &&
              submission.content_url && (
                <a
                  href={submission.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline mb-3"
                >
                  <ExternalLink className="w-4 h-4" />
                  查看内容
                </a>
              )}

            {/* 描述 */}
            {submission.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {submission.description}
              </p>
            )}

            {/* 标签 */}
            {submission.tags && submission.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {submission.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LikeButton
                targetType="submission"
                targetId={submission.id}
                initialCount={submission.like_count}
                size="sm"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {submission.comment_count}
              </Button>
            </div>

            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIterateForm(true)}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                迭代
              </Button>
            )}
          </CardFooter>

          {/* 展开的评论区 */}
          {expanded && (
            <div className="px-4 pb-4 border-t">
              <CommentSection
                targetType="submission"
                targetId={submission.id}
                showTitle={false}
                className="pt-4"
              />
            </div>
          )}
        </Card>
      </m.div>

      {/* 迭代表单 */}
      <SubmissionForm
        workshopId={submission.workshop_id}
        open={showIterateForm}
        onClose={() => setShowIterateForm(false)}
        onSuccess={onRefresh}
        parentId={submission.id}
      />
    </>
  );
}
