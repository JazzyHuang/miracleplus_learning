'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import { createWorkshop, updateWorkshop } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { urlSchema } from '@/lib/validations';
import { ImageUpload } from '@/components/workshop/image-upload';
import type { Workshop } from '@/types/database';

const adminWorkshopSchema = z.object({
  title: z.string().min(1, '请输入活动标题').max(100, '标题不能超过100字符'),
  description: z.string().max(1000, '描述不能超过1000字符').optional(),
  cover_image: z.string().optional().or(z.literal('')),
  event_date: z.string().min(1, '请选择活动日期'),
  feishu_url: urlSchema,
});

interface WorkshopFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshop: Workshop | null;
  onSuccess: () => void;
}

export function WorkshopFormDialog({
  open,
  onOpenChange,
  workshop,
  onSuccess,
}: WorkshopFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    feishu_url: '',
  });

  // Sync form data when dialog opens with a workshop to edit
  useEffect(() => {
    if (!open) return;
    if (workshop) {
      setFormData({
        title: workshop.title,
        description: workshop.description || '',
        cover_image: workshop.cover_image || '',
        event_date: workshop.event_date,
        feishu_url: workshop.feishu_url || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        cover_image: '',
        event_date: format(new Date(), 'yyyy-MM-dd'),
        feishu_url: '',
      });
    }
  }, [open, workshop]);

  const handleSave = async () => {
    const validation = adminWorkshopSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError?.message || '表单验证失败');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || '',
        cover_image: formData.cover_image || '',
        start_date: formData.event_date,
        end_date: formData.event_date,
        feishu_url: formData.feishu_url || '',
        is_published: true,
      };

      const result = workshop
        ? await updateWorkshop(workshop.id, payload)
        : await createWorkshop(payload);

      if (!result.success) {
        toast.error(result.error ?? '操作失败');
        return;
      }

      toast.success(workshop ? '活动已更新' : '活动创建成功');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      logger.error('WorkshopFormDialog save error:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSaving(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{workshop ? '编辑活动' : '创建新活动'}</DialogTitle>
          <DialogDescription>填写活动信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ws-title">活动标题 *</Label>
            <Input id="ws-title" value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="输入活动标题" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-date">活动日期 *</Label>
            <Input id="ws-date" type="date" value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-desc">活动简介</Label>
            <Textarea id="ws-desc" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="输入活动简介" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>封面图片</Label>
            <ImageUpload onUpload={(url) => setFormData({ ...formData, cover_image: url })}
              existingUrl={formData.cover_image} folder="covers" autoUpload aspectRatio="video" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-feishu">飞书链接</Label>
            <Input id="ws-feishu" value={formData.feishu_url}
              onChange={(e) => setFormData({ ...formData, feishu_url: e.target.value })}
              placeholder="https://..." />
            <p className="text-xs text-muted-foreground">用户点击活动卡片将直接跳转到此链接</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : workshop ? '更新' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
