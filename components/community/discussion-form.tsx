'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createDiscussionsService } from '@/lib/community';
import { createBadgesService } from '@/lib/points/badges';
import { logger } from '@/lib/logger';

// 表单验证 Schema
const discussionSchema = z.object({
  title: z.string().min(5, '标题至少 5 个字').max(100, '标题不能超过 100 字'),
  content: z.string().min(20, '内容至少 20 个字').max(2000, '内容不能超过 2000 字'),
  tags: z.array(z.string()).optional(),
});

type DiscussionFormData = z.infer<typeof discussionSchema>;

interface DiscussionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TAG_OPTIONS = [
  'AI 学习', '职业发展', '求职分享', '技术交流',
  '产品设计', '创业思考', '读书笔记', '工具推荐',
  '求助提问', '闲聊水区',
];

/**
 * 发布讨论话题表单
 */
export function DiscussionForm({ open, onClose, onSuccess }: DiscussionFormProps) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    };
  }, []);

  const form = useForm<DiscussionFormData>({
    resolver: zodResolver(discussionSchema),
    defaultValues: {
      title: '',
      content: '',
      tags: [],
    },
  });

  const handleSubmit = async (data: DiscussionFormData) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    // 防止快速多次点击重复提交
    if (submitting) return;

    setSubmitting(true);

    try {
      const supabase = createClient();
      const discussionsService = createDiscussionsService(supabase);

      const result = await discussionsService.createDiscussion(user.id, {
        title: data.title,
        content: data.content,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      if (!result.success) {
        toast.error(result.error || '发布失败');
        return;
      }

      if (result.pointsEarned && result.pointsEarned > 0) {
        toast.success(
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning" />
            <span>话题发布成功！获得 {result.pointsEarned} 积分</span>
          </div>
        );

        // 检查并解锁勋章
        const badgesService = createBadgesService(supabase);
        const unlockedBadges = await badgesService.checkAndUnlockBadges(user.id);
        if (unlockedBadges.length > 0) {
          badgeTimerRef.current = setTimeout(() => {
            unlockedBadges.forEach((badge) => {
              toast.success(
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏅</span>
                  <span>解锁勋章：{badge.name}</span>
                </div>
              );
            });
          }, 1000);
        }
      } else {
        toast.success('话题发布成功！');
      }

      form.reset();
      setSelectedTags([]);
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('发布讨论失败:', error);
      toast.error('发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 3
        ? [...prev, tag]
        : prev
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            发起讨论
          </DialogTitle>
          <DialogDescription>
            分享你的想法，与社区成员交流
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* 话题标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">话题标题 *</Label>
            <Input
              id="title"
              placeholder="用一句话概括你想讨论的话题"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* 话题内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">话题内容 *</Label>
            <Textarea
              id="content"
              placeholder="详细描述你想讨论的内容（至少 20 个字）"
              rows={6}
              {...form.register('content')}
            />
            <div className="flex justify-between">
              {form.formState.errors.content && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.content.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {form.watch('content')?.length || 0}/2000
              </p>
            </div>
          </div>

          {/* 标签选择 */}
          <div className="space-y-2">
            <Label>选择标签（最多 3 个）</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* 积分提示 */}
          <div className="rounded-lg bg-warning/10 p-3 text-sm">
            <p className="text-warning">
              💡 发布话题可获得 <strong>20 积分</strong>
              <br />
              <span className="text-xs">话题参与人数超过 10 人可额外获得 100 积分</span>
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '发布中...' : '发布话题'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
