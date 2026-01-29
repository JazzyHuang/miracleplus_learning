'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
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
import { cn } from '@/lib/utils';
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
  targetType: 'checkin' | 'submission' | 'workshop' | 'course' | 'note';
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
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  // 获取评论列表
  const fetchComments = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('is_deleted', false)
      .is('parent_id', null)  // 只获取顶级评论
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取评论失败:', error);
      setLoading(false);
      return;
    }

    // 获取回复
    const commentIds = data.map((c) => c.id);
    if (commentIds.length > 0) {
      const { data: replies } = await supabase
        .from('comments')
        .select(`
          *,
          user:users (id, name, email, avatar_url)
        `)
        .in('parent_id', commentIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      // 将回复附加到父评论
      const commentsWithReplies = data.map((comment) => ({
        ...comment,
        replies: replies?.filter((r) => r.parent_id === comment.id) || [],
      }));

      setComments(commentsWithReplies as Comment[]);
    } else {
      setComments(data as Comment[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [targetType, targetId]);

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

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('comments').insert({
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
      fetchComments();  // 刷新评论列表
    } catch (err) {
      toast.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除评论
  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      if (error) {
        toast.error('删除失败');
        return;
      }

      toast.success('评论已删除');
      fetchComments();
    } catch (err) {
      toast.error('删除失败');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
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
        <div className="space-y-4">
          <AnimatePresence>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user?.id}
                onReply={() => setReplyTo(comment)}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
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
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex gap-3', isReply && 'ml-12')}
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
    </m.div>
  );
}
