'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lightbulb, Camera, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
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
import { ImageUpload } from '@/components/workshop/image-upload';
import { createAIToolsService } from '@/lib/ai-tools';
import { createBadgesService } from '@/lib/points/badges';
import { POINT_RULES } from '@/lib/points/config';
import { logger } from '@/lib/logger';

// 表单验证 Schema
const experienceSchema = z.object({
  use_case: z.string().min(10, '使用场景至少 10 个字').max(500, '使用场景不能超过 500 字'),
  pros: z.string().max(300, '优点描述不能超过 300 字').optional(),
  cons: z.string().max(300, '缺点描述不能超过 300 字').optional(),
  screenshot_url: z.string().min(1, '请上传截图'),
});

type ExperienceFormData = z.infer<typeof experienceSchema>;

interface ExperienceFormProps {
  toolId: string;
  toolName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 灵感碎片表单组件
 */
export function ExperienceForm({
  toolId,
  toolName,
  open,
  onClose,
  onSuccess,
}: ExperienceFormProps) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');

  const form = useForm<ExperienceFormData>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      use_case: '',
      pros: '',
      cons: '',
      screenshot_url: '',
    },
  });

  const handleSubmit = async (data: ExperienceFormData) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);

      const result = await aiToolsService.submitExperience(user.id, toolId, {
        use_case: data.use_case,
        pros: data.pros || undefined,
        cons: data.cons || undefined,
        screenshot_url: screenshotUrl,
      });

      if (!result.success) {
        toast.error(result.error || '提交失败');
        return;
      }

      if (result.pointsEarned && result.pointsEarned > 0) {
        toast.success(
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning" />
            <span>灵感碎片发布成功！获得 {result.pointsEarned} 积分</span>
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
        toast.success('灵感碎片发布成功！');
      }

      form.reset();
      setScreenshotUrl('');
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('提交灵感碎片失败:', error);
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setScreenshotUrl(url);
    form.setValue('screenshot_url', url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-warning" />
            分享灵感碎片
          </DialogTitle>
          <DialogDescription>
            记录你使用 {toolName} 的心得体验
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* 使用场景 */}
          <div className="space-y-2">
            <Label htmlFor="use_case">使用场景 *</Label>
            <Textarea
              id="use_case"
              placeholder="描述你是如何使用这个工具的，解决了什么问题？"
              rows={4}
              {...form.register('use_case')}
            />
            {form.formState.errors.use_case && (
              <p className="text-sm text-destructive">
                {form.formState.errors.use_case.message}
              </p>
            )}
          </div>

          {/* 优点 */}
          <div className="space-y-2">
            <Label htmlFor="pros">优点</Label>
            <Textarea
              id="pros"
              placeholder="这个工具有什么优点？"
              rows={2}
              {...form.register('pros')}
            />
          </div>

          {/* 缺点 */}
          <div className="space-y-2">
            <Label htmlFor="cons">缺点</Label>
            <Textarea
              id="cons"
              placeholder="这个工具有什么不足？"
              rows={2}
              {...form.register('cons')}
            />
          </div>

          {/* 截图上传 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              上传截图 *
            </Label>
            <ImageUpload
              onUpload={handleImageUpload}
              existingUrl={screenshotUrl}
              folder="experiences"
              submitText="确认上传"
            />
            {form.formState.errors.screenshot_url && (
              <p className="text-sm text-destructive">
                {form.formState.errors.screenshot_url.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              上传工具使用截图，帮助其他用户了解
            </p>
          </div>

          {/* 积分提示 */}
          <div className="rounded-lg bg-warning/10 p-3 text-sm">
            <p className="text-warning">
              💡 发布灵感碎片可获得 <strong>{POINT_RULES.TOOL_EXPERIENCE} 积分</strong>
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
              {submitting ? '发布中...' : '发布'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
