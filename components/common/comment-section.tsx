'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageCircle, Send, Reply, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LikeButton } from './like-button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { DB } from '@/lib/db-tables';
import type { User } from '@/types/database';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  like_count: number;
  parent_id: string | null;
  created_at: string;
  user: User;
  replies?: Comment[];
}

interface CommentSectionProps {
  /** 目标类型 */
  targetType: 'checkin' | 'submission' | 'workshop' | 'course' | 'note' | 'discussion';
  /** 目标 ID */
  targetId: string;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 通用评论区组件
 * 
 * - 支持嵌套回复
 * - 支持点赞
 * - 支持删除（仅自己的评论）
 */
export function CommentSection({
  targetType,
  targetId,
  showTitle = true,
  className,
}: CommentSectionProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // 获取评论列表 — 使用 useCallback 避免每次渲染重新创建导致 useEffect 反复触发
  const fetchComments = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(DB.comments)
      .select(`
        *,
        user:${DB.users} (id, name, email, avatar_url)
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('is_deleted', false)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (!mountedRef.current) return;

    if (error) {
      logger.error('获取评论失败:', error);
      toast.error('评论加载失败');
      setLoading(false);
      return;
    }

    if (!data) {
      setComments([]);
      setLoading(false);
      return;
    }

    // 获取回复
    const commentIds = data.map((c: { id: string }) => c.id);
    if (commentIds.length > 0) {
      const { data: replies } = await supabase
        .from(DB.comments)
        .select(`
          *,
          user:${DB.users} (id, name, email, avatar_url)
        `)
        .in('parent_id', commentIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (!mountedRef.current) return;

      const commentsWithReplies = data.map((comment: { id: string }) => ({
        ...comment,
        replies: replies?.filter((r: { parent_id: string }) => r.parent_id === comment.id) || [],
      }));

      // 类型安全：Supabase 查询 select 保证结构与 Comment 一致
      setComments(commentsWithReplies as Comment[]);
    } else {
      setComments(data as Comment[]);
    }

    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 提交评论
  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    const content = newComment.trim();
    if (content.length < 5) {
      toast.error('评论内容至少 5 个字');
      return;
    }
    if (content.length > 500) {
      toast.error('评论内容不能超过 500 字');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from(DB.comments).insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        parent_id: replyTo?.id || null,
        content,
      });

      if (error) {
        toast.error('评论失败: ' + error.message);
        return;
      }

      toast.success('评论成功');
      setNewComment('');
      setReplyTo(null);
      setRefreshing(true);
      fetchComments().finally(() => setRefreshing(false));
    } catch (error) {
      logger.error('提交评论失败:', error);
      toast.error('评论失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除评论 — 使用 ConfirmDialog 替代原生 confirm()
  const handleDelete = async (commentId: string) => {
    const confirmed = await confirm({
      title: '删除评论',
      description: '确定要删除这条评论吗？此操作无法撤销。',
      variant: 'destructive',
      confirmText: '删除',
    });
    if (!confirmed) return;

    if (!user) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from(DB.comments)
        .update({ is_deleted: true })
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('删除失败');
        return;
      }

      toast.success('评论已删除');
      setRefreshing(true);
      fetchComments().finally(() => setRefreshing(false));
    } catch (error) {
      logger.error('删除评论失败:', error);
      toast.error('删除失败，请稍后重试');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {ConfirmDialogComponent}
      {showTitle && (
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-semibold">评论 ({comments.length})</h3>
        </div>
      )}

      {/* 评论输入框 */}
      {user ? (
        <div className="space-y-3">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Reply className="w-4 h-4" />
              <span>回复 @{replyTo.user.name || replyTo.user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 ml-auto"
                onClick={() => setReplyTo(null)}
              >
                取消
              </Button>
            </div>
          )}
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
              {user.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder={replyTo ? `回复 @${replyTo.user.name || replyTo.user.email}...` : '写下你的评论...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/500
                </span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting || newComment.trim().length < 5}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? '发送中...' : '发送'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          请先登录后发表评论
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          暂无评论，来说点什么吧~
        </div>
      ) : (
        <div className={cn('space-y-4 transition-opacity', refreshing && 'opacity-60 pointer-events-none')}>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user?.id}
                onReply={() => setReplyTo(comment)}
                onDelete={handleDelete}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * 单条评论组件
 */
function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: Comment;
  currentUserId?: string;
  onReply: () => void;
  onDelete: (id: string) => void;
  isReply?: boolean;
}) {
  const isOwner = currentUserId === comment.user_id;

  return (
    <div
      className={cn('flex gap-3 animate-fade-up', isReply && 'ml-12')}
    >
      <Avatar className={isReply ? 'w-8 h-8' : 'w-10 h-10'}>
        <AvatarImage src={comment.user.avatar_url || undefined} />
        <AvatarFallback className={isReply ? 'text-xs' : 'text-sm'}>
          {comment.user.name?.[0] || comment.user.email?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {comment.user.name || comment.user.email}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(comment.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
          </span>
        </div>

        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>

        <div className="flex items-center gap-1 mt-2">
          <LikeButton
            targetType="comment"
            targetId={comment.id}
            initialCount={comment.like_count}
            iconType="thumbsUp"
            size="sm"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onReply}
          >
            <Reply className="w-3.5 h-3.5 mr-1" />
            回复
          </Button>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  aria-label="删除评论"
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(comment.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* 回复列表 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onReply={onReply}
                onDelete={onDelete}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
