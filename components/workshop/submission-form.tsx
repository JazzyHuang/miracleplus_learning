'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as LinkIcon, FileText, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from './image-upload';
import { createPointsService } from '@/lib/points/service';
import { createBadgesService } from '@/lib/points/badges';

// 表单验证 Schema
const submissionSchema = z.object({
  title: z.string().min(2, '标题至少 2 个字').max(100, '标题不能超过 100 字'),
  content_type: z.enum(['image', 'document', 'link', 'text']),
  content_url: z.string().optional(),
  content_text: z.string().optional(),
  description: z.string().max(500, '描述不能超过 500 字').optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.content_type === 'text') {
      return data.content_text && data.content_text.length >= 10;
    }
    return data.content_url && data.content_url.length > 0;
  },
  {
    message: '请填写作品内容',
    path: ['content_url'],
  }
);

type SubmissionFormData = z.infer<typeof submissionSchema>;

interface SubmissionFormProps {
  /** Workshop ID */
  workshopId: string;
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交成功回调 */
  onSuccess?: () => void;
  /** 迭代的父作品 ID */
  parentId?: string;
}

const TAG_OPTIONS = [
  '设计', '代码', '文案', '策划', '数据分析', 'AI应用',
  '产品', '运营', '营销', '其他',
];

/**
 * 作品提交表单组件
 */
export function SubmissionForm({
  workshopId,
  open,
  onClose,
  onSuccess,
  parentId,
}: SubmissionFormProps) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      title: '',
      content_type: 'image',
      content_url: '',
      content_text: '',
      description: '',
      tags: [],
    },
  });

  const contentType = form.watch('content_type');

  const handleSubmit = async (data: SubmissionFormData) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      
      const submissionData = {
        user_id: user.id,
        workshop_id: workshopId,
        title: data.title,
        content_type: data.content_type,
        content_url: data.content_type !== 'text' ? (imageUrl || data.content_url) : null,
        content_text: data.content_type === 'text' ? data.content_text : null,
        description: data.description || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
        parent_id: parentId || null,
        status: 'pending',
      };

      const { error } = await supabase
        .from('workshop_submissions')
        .insert(submissionData);

      if (error) {
        toast.error('提交失败: ' + error.message);
        return;
      }

      // 发放积分
      const pointsService = createPointsService(supabase);
      const actionType = parentId ? 'WORKSHOP_ITERATION' : 'WORKSHOP_SUBMISSION';
      const pointsResult = await pointsService.addPoints(
        user.id,
        actionType,
        workshopId,
        'workshop_submission',
        parentId ? '作品迭代提交' : '首次作品提交'
      );

      if (pointsResult.success && pointsResult.pointsAdded > 0) {
        toast.success(
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>
              {parentId ? '作品迭代提交成功！' : '作品提交成功！'}
              获得 {pointsResult.pointsAdded} 积分
            </span>
          </div>
        );

        // 检查并解锁勋章
        const badgesService = createBadgesService(supabase);
        const unlockedBadges = await badgesService.checkAndUnlockBadges(user.id);
        if (unlockedBadges.length > 0) {
          setTimeout(() => {
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
        toast.success(parentId ? '作品迭代提交成功！等待审核中' : '作品提交成功！等待审核中');
      }

      form.reset();
      setSelectedTags([]);
      setImageUrl('');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('提交失败');
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
          <DialogTitle>
            {parentId ? '迭代作品' : '提交作品'}
          </DialogTitle>
          <DialogDescription>
            分享你在 Workshop 中的学习成果
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* 作品标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">作品标题 *</Label>
            <Input
              id="title"
              placeholder="给你的作品起个名字"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* 内容类型 */}
          <div className="space-y-2">
            <Label>内容类型 *</Label>
            <Select
              value={contentType}
              onValueChange={(v) => form.setValue('content_type', v as 'image' | 'document' | 'link' | 'text')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    图片
                  </div>
                </SelectItem>
                <SelectItem value="link">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    链接
                  </div>
                </SelectItem>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    文档
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    文本
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 内容上传/输入 */}
          {contentType === 'image' && (
            <div className="space-y-2">
              <Label>上传图片 *</Label>
              <ImageUpload
                onUpload={(url: string) => {
                  setImageUrl(url);
                  form.setValue('content_url', url);
                }}
                existingUrl={imageUrl}
              />
            </div>
          )}

          {contentType === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="link">链接地址 *</Label>
              <Input
                id="link"
                type="url"
                placeholder="https://..."
                {...form.register('content_url')}
              />
            </div>
          )}

          {contentType === 'document' && (
            <div className="space-y-2">
              <Label htmlFor="doc">文档链接 *</Label>
              <Input
                id="doc"
                type="url"
                placeholder="飞书/Google Docs/Notion 链接"
                {...form.register('content_url')}
              />
              <p className="text-xs text-muted-foreground">
                支持飞书、Google Docs、Notion 等在线文档链接
              </p>
            </div>
          )}

          {contentType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="text">作品内容 *</Label>
              <Textarea
                id="text"
                placeholder="写下你的作品内容（至少 10 个字）"
                rows={6}
                {...form.register('content_text')}
              />
            </div>
          )}

          {form.formState.errors.content_url && (
            <p className="text-sm text-destructive">
              {form.formState.errors.content_url.message}
            </p>
          )}

          {/* 作品描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">作品描述</Label>
            <Textarea
              id="description"
              placeholder="简单介绍一下你的作品"
              rows={3}
              {...form.register('description')}
            />
          </div>

          {/* 标签选择 */}
          <div className="space-y-2">
            <Label>标签（最多选 3 个）</Label>
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
              {submitting ? '提交中...' : '提交作品'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
