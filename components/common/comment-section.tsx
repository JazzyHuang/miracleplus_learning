'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageCircle, Send, Reply, MoreHorizontal, Trash2, ArrowUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { DB, RPC } from '@/lib/db-tables';
import type { User } from '@/types/database';

type SortMode = 'newest' | 'oldest' | 'popular';

/** 评论中的用户信息（仅包含 RPC 返回的字段） */
type CommentUser = Pick<User, 'id' | 'name' | 'email' | 'avatar_url'>;

interface Comment {
  id: string;
  user_id: string;
  content: string;
  like_count: number;
  parent_id: string | null;
  created_at: string;
  user: CommentUser;
  replies?: Comment[];
  hasMoreReplies?: boolean;
}

interface CommentSectionProps {
  /** 目标类型 */
  targetType: 'checkin' | 'submission' | 'workshop' | 'course' | 'note' | 'discussion' | 'ai_tool';
  /** 目标 ID */
  targetId: string;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 评论成功回调（用于积分奖励等） */
  onCommentSuccess?: (commentId: string, content: string) => void;
  /** 初始排序模式 */
  defaultSort?: SortMode;
}

const PAGE_SIZE = 10;
const REPLY_PREVIEW_LIMIT = 3;

/** RPC 返回的评论结构（JSONB） */
interface RpcComment {
  id: string;
  user_id: string;
  content: string;
  like_count: number;
  parent_id: string | null;
  created_at: string;
  user: { id: string; name: string | null; email: string; avatar_url: string | null };
  replies: RpcComment[] | null;
  reply_count: number;
}

/** 将 RPC 返回的 JSONB 映射为组件内部 Comment 类型 */
function mapRpcComment(c: RpcComment): Comment {
  return {
    id: c.id,
    user_id: c.user_id,
    content: c.content,
    like_count: c.like_count,
    parent_id: c.parent_id,
    created_at: c.created_at,
    user: { id: c.user.id, name: c.user.name, email: c.user.email, avatar_url: c.user.avatar_url },
    replies: (c.replies ?? []).map(mapRpcComment),
    hasMoreReplies: c.reply_count > (c.replies?.length ?? 0),
  };
}

/**
 * 通用评论区组件
 *
 * - 支持嵌套回复
 * - 支持点赞
 * - 支持删除（仅自己的评论）
 * - 支持排序（最新/最早/最热）
 * - 支持分页（加载更多）
 * - 支持 Ctrl+Enter 快捷提交
 * - 乐观插入新评论
 */
export function CommentSection({
  targetType,
  targetId,
  showTitle = true,
  className,
  onCommentSuccess,
  defaultSort = 'newest',
}: CommentSectionProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(defaultSort);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const mountedRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // 获取评论总数
  const fetchTotalCount = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from(DB.comments)
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('is_deleted', false)
      .is('parent_id', null);
    if (mountedRef.current && count !== null) setTotalCount(count);
  }, [targetType, targetId]);

  // 获取评论列表（单次 RPC 调用，含嵌套回复）
  const fetchComments = useCallback(async (offset = 0, append = false) => {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)(RPC.get_comments_with_replies, {
      p_target_type: targetType,
      p_target_id: targetId,
      p_limit: PAGE_SIZE,
      p_offset: offset,
      p_reply_limit: REPLY_PREVIEW_LIMIT,
      p_sort: sortMode,
    });

    if (!mountedRef.current) return;

    if (error) {
      logger.error('获取评论失败:', error);
      toast.error('评论加载失败');
      setLoading(false);
      return;
    }

    const commentsWithReplies = ((data as RpcComment[] | null) ?? []).map(mapRpcComment);

    if (append) {
      setComments(prev => [...prev, ...commentsWithReplies]);
    } else {
      setComments(commentsWithReplies);
    }
    setLoading(false);
  }, [targetType, targetId, sortMode]);

  // 加载某条评论的更多回复
  const loadMoreReplies = useCallback(async (commentId: string) => {
    const supabase = createClient();
    const { data: replies, error } = await supabase
      .from(DB.comments)
      .select(`*, user:${DB.users} (id, name, email, avatar_url)`)
      .eq('parent_id', commentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !replies || !mountedRef.current) return;

    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, replies: replies as Comment[], hasMoreReplies: false }
        : c
    ));
  }, []);

  useEffect(() => {
    setLoading(true);
    setComments([]);
    fetchComments();
    fetchTotalCount();
  }, [fetchComments, fetchTotalCount]);

  // 加载更多
  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchComments(comments.length, true);
    setLoadingMore(false);
  };

  // 排序切换
  const handleSortChange = (value: string) => {
    setSortMode(value as SortMode);
  };

  // 提交评论
  const handleSubmit = async () => {
    if (!user) { toast.error('请先登录'); return; }

    const content = newComment.trim();
    if (content.length < 5) { toast.error('评论内容至少 5 个字'); return; }
    if (content.length > 500) { toast.error('评论内容不能超过 500 字'); return; }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: inserted, error } = await supabase.from(DB.comments).insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        parent_id: replyTo?.id || null,
        content,
      }).select('id').single();

      if (error) { toast.error('评论失败: ' + error.message); return; }

      // 乐观插入
      const optimisticComment: Comment = {
        id: inserted?.id || crypto.randomUUID(),
        user_id: user.id,
        content,
        like_count: 0,
        parent_id: replyTo?.id || null,
        created_at: new Date().toISOString(),
        user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
        replies: [],
      };

      if (replyTo) {
        // 插入为回复
        setComments(prev => prev.map(c =>
          c.id === replyTo.id
            ? { ...c, replies: [...(c.replies || []), optimisticComment] }
            : c
        ));
      } else {
        // 插入为顶级评论
        if (sortMode === 'oldest') {
          setComments(prev => [...prev, optimisticComment]);
        } else {
          setComments(prev => [optimisticComment, ...prev]);
        }
        setTotalCount(prev => prev + 1);
      }

      toast.success('评论成功');
      setNewComment('');
      setReplyTo(null);
      onCommentSuccess?.(optimisticComment.id, content);
    } catch (_err) {
      logger.error('提交评论失败:', _err);
      toast.error('评论失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // Ctrl+Enter 快捷提交
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!submitting && newComment.trim().length >= 5) handleSubmit();
    }
  };

  // 删除评论
  const handleDelete = async (commentId: string) => {
    const confirmed = await confirm({
      title: '删除评论',
      description: '确定要删除这条评论吗？此操作无法撤销。',
      variant: 'destructive',
      confirmText: '删除',
    });
    if (!confirmed || !user) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from(DB.comments)
        .update({ is_deleted: true })
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) { toast.error('删除失败'); return; }

      // 淡出动画后移除
      setDeletingIds(prev => new Set(prev).add(commentId));
      setTimeout(() => {
        setComments(prev => prev
          .filter(c => c.id !== commentId)
          .map(c => ({
            ...c,
            replies: c.replies?.filter(r => r.id !== commentId),
          }))
        );
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
        setTotalCount(prev => Math.max(0, prev - 1));
      }, 200);
      toast.success('评论已删除');
    } catch (_err) {
      logger.error('删除评论失败:', _err);
      toast.error('删除失败，请稍后重试');
    }
  };

  // 点击回复时聚焦输入框
  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const hasMore = comments.length < totalCount;
  const charCount = newComment.length;

  return (
    <div className={cn('space-y-4', className)}>
      {ConfirmDialogComponent}

      {/* 标题 + 排序 */}
      <div className="flex items-center justify-between">
        {showTitle && (
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">评论 ({totalCount})</h3>
          </div>
        )}
        {totalCount > 1 && (
          <Select value={sortMode} onValueChange={handleSortChange}>
            <SelectTrigger className="w-28 h-8 text-xs" aria-label="评论排序">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">最新</SelectItem>
              <SelectItem value="oldest">最早</SelectItem>
              <SelectItem value="popular">最热</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 评论输入框 */}
      {user ? (
        <div className="space-y-3">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Reply className="w-4 h-4" />
              <span>回复 @{replyTo.user.name || replyTo.user.email}</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 ml-auto" onClick={() => setReplyTo(null)}>
                取消
              </Button>
            </div>
          )}
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{user.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                ref={textareaRef}
                placeholder={replyTo ? `回复 @${replyTo.user.name || replyTo.user.email}...` : '写下你的评论...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="resize-none"
                aria-label="写评论"
                aria-describedby="comment-char-count"
              />
              <div className="flex justify-between items-center">
                <span
                  id="comment-char-count"
                  className={cn(
                    'text-xs',
                    charCount > 450 ? 'text-destructive' : charCount > 400 ? 'text-warning' : 'text-muted-foreground'
                  )}
                >
                  {charCount}/500
                  <span className="ml-2 text-muted-foreground hidden sm:inline">Ctrl+Enter 发送</span>
                </span>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || newComment.trim().length < 5}>
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
        <div role="feed" aria-label="评论列表" className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onReply={() => handleReply(comment)}
              onDelete={handleDelete}
              onLoadMoreReplies={loadMoreReplies}
              deletingIds={deletingIds}
            />
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {hasMore && !loading && (
        <div className="text-center pt-2">
          <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />加载中...</>
            ) : (
              <>加载更多评论（还有 {totalCount - comments.length} 条）</>
            )}
          </Button>
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
  onLoadMoreReplies,
  deletingIds,
  isReply = false,
}: {
  comment: Comment;
  currentUserId?: string;
  onReply: () => void;
  onDelete: (id: string) => void;
  onLoadMoreReplies?: (commentId: string) => void;
  deletingIds: Set<string>;
  isReply?: boolean;
}) {
  const isOwner = currentUserId === comment.user_id;
  const userName = comment.user.name || comment.user.email;

  return (
    <div role="article" className={cn('flex gap-3 animate-fade-up', isReply && 'ml-12', deletingIds.has(comment.id) && 'animate-fade-out')}>
      <Avatar className={isReply ? 'w-8 h-8' : 'w-10 h-10'}>
        <AvatarImage src={comment.user.avatar_url || undefined} />
        <AvatarFallback className={isReply ? 'text-xs' : 'text-sm'}>
          {comment.user.name?.[0] || comment.user.email?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{userName}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(comment.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
          </span>
        </div>

        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>

        <div className="flex items-center gap-1 mt-2">
          <LikeButton targetType="comment" targetId={comment.id} initialCount={comment.like_count} iconType="thumbsUp" size="sm" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onReply}
            aria-label={`回复 ${userName} 的评论`}
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
                deletingIds={deletingIds}
                isReply
              />
            ))}
            {comment.hasMoreReplies && onLoadMoreReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground ml-12"
                onClick={() => onLoadMoreReplies(comment.id)}
              >
                查看更多回复
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
