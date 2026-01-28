'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mic, Clock, Users, FileText, Link as LinkIcon } from 'lucide-react';
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

// 表单验证 Schema
const applicationSchema = z.object({
  topic: z.string().min(5, '主题至少 5 个字').max(100, '主题不能超过 100 字'),
  description: z.string().min(20, '简介至少 20 个字').max(1000, '简介不能超过 1000 字'),
  outline: z.string().min(10, '大纲至少 10 个字').max(2000, '大纲不能超过 2000 字'),
  duration: z.coerce.number().min(15, '时长至少 15 分钟').max(180, '时长不能超过 180 分钟'),
  target_audience: z.string().max(200, '目标受众不能超过 200 字').optional(),
  prerequisites: z.string().max(500, '先决条件不能超过 500 字').optional(),
  materials_url: z.string().url('请输入有效的链接').optional().or(z.literal('')),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface InstructorApplyFormProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交成功回调 */
  onSuccess?: () => void;
}

const DURATION_OPTIONS = [
  { value: '30', label: '30 分钟' },
  { value: '45', label: '45 分钟' },
  { value: '60', label: '60 分钟' },
  { value: '90', label: '90 分钟' },
  { value: '120', label: '120 分钟' },
];

/**
 * 讲师申请表单组件
 */
export function InstructorApplyForm({
  open,
  onClose,
  onSuccess,
}: InstructorApplyFormProps) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      topic: '',
      description: '',
      outline: '',
      duration: 60,
      target_audience: '',
      prerequisites: '',
      materials_url: '',
    },
  });

  const handleSubmit = async (data: ApplicationFormData) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('instructor_applications')
        .insert({
          user_id: user.id,
          topic: data.topic,
          description: data.description,
          outline: data.outline,
          duration: data.duration,
          target_audience: data.target_audience || null,
          prerequisites: data.prerequisites || null,
          materials_url: data.materials_url || null,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('你已经申请过相同主题了');
        } else {
          toast.error('提交失败: ' + error.message);
        }
        return;
      }

      toast.success('申请提交成功！我们会尽快审核');
      form.reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            申请成为讲师
          </DialogTitle>
          <DialogDescription>
            分享你的知识和经验，成为 Workshop 讲师
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* 课程主题 */}
          <div className="space-y-2">
            <Label htmlFor="topic">课程主题 *</Label>
            <Input
              id="topic"
              placeholder="例如：如何使用 AI 提升工作效率"
              {...form.register('topic')}
            />
            {form.formState.errors.topic && (
              <p className="text-sm text-destructive">
                {form.formState.errors.topic.message}
              </p>
            )}
          </div>

          {/* 课程简介 */}
          <div className="space-y-2">
            <Label htmlFor="description">课程简介 *</Label>
            <Textarea
              id="description"
              placeholder="简单介绍你的课程内容和学习目标"
              rows={3}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* 课程大纲 */}
          <div className="space-y-2">
            <Label htmlFor="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              课程大纲 *
            </Label>
            <Textarea
              id="outline"
              placeholder={`例如：
1. 开场介绍（5分钟）
2. AI 工具概览（15分钟）
3. 实战演示（25分钟）
4. 答疑互动（15分钟）`}
              rows={6}
              {...form.register('outline')}
            />
            {form.formState.errors.outline && (
              <p className="text-sm text-destructive">
                {form.formState.errors.outline.message}
              </p>
            )}
          </div>

          {/* 预计时长 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              预计时长 *
            </Label>
            <Select
              value={String(form.watch('duration'))}
              onValueChange={(v) => form.setValue('duration', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 目标受众 */}
          <div className="space-y-2">
            <Label htmlFor="target_audience" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              目标受众
            </Label>
            <Input
              id="target_audience"
              placeholder="例如：对 AI 感兴趣的初学者"
              {...form.register('target_audience')}
            />
          </div>

          {/* 先决条件 */}
          <div className="space-y-2">
            <Label htmlFor="prerequisites">参与条件</Label>
            <Textarea
              id="prerequisites"
              placeholder="学员需要具备哪些前提知识或准备"
              rows={2}
              {...form.register('prerequisites')}
            />
          </div>

          {/* 准备材料链接 */}
          <div className="space-y-2">
            <Label htmlFor="materials_url" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              准备材料链接
            </Label>
            <Input
              id="materials_url"
              type="url"
              placeholder="飞书/Google Docs 等链接（可选）"
              {...form.register('materials_url')}
            />
            <p className="text-xs text-muted-foreground">
              如有 PPT、文档等材料，可以提供链接
            </p>
          </div>

          {/* 奖励说明 */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              💡 讲师奖励
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
              <li>• 成功担任讲师可获得 <strong>400 积分</strong></li>
              <li>• 获得专属"讲师"徽章</li>
              <li>• 课程将被收录到讲师风采墙</li>
            </ul>
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
              {submitting ? '提交中...' : '提交申请'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
