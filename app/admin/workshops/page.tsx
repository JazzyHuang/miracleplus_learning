'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { z } from 'zod';
import {
  CalendarDays,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  Users,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import {
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  setWorkshopActive,
} from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import type { Workshop } from '@/types/database';
import { DB } from '@/lib/db-tables';

/**
 * Workshop 表单验证 Schema
 * P1 修复：使用统一的 Zod 验证
 */
const adminWorkshopSchema = z.object({
  title: z.string().min(1, '请输入活动标题').max(100, '标题不能超过100字符'),
  description: z.string().max(1000, '描述不能超过1000字符').optional(),
  cover_image: z.string().optional().or(z.literal('')),
  event_date: z.string().min(1, '请选择活动日期'),
  feishu_url: urlSchema,
});

interface WorkshopWithCount extends Workshop {
  checkin_count?: number;
}

export default function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState<WorkshopWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    event_date: '',
    feishu_url: '',
  });

  const fetchWorkshops = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(DB.workshops)
      .select(`
        *,
        workshop_checkins (count)
      `)
      .order('event_date', { ascending: false });

    if (!error && data) {
      // 定义查询返回的数据类型
      type WorkshopQueryResult = Workshop & {
        workshop_checkins: Array<{ count: number }>;
      };
      
      const workshopsWithCount = (data as WorkshopQueryResult[]).map((w) => ({
        ...w,
        checkin_count: w.workshop_checkins?.[0]?.count || 0,
      }));
      setWorkshops(workshopsWithCount);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkshops();
  }, []);

  const handleOpenDialog = (workshop?: Workshop) => {
    if (workshop) {
      setEditingWorkshop(workshop);
      setFormData({
        title: workshop.title,
        description: workshop.description || '',
        cover_image: workshop.cover_image || '',
        event_date: workshop.event_date,
        feishu_url: workshop.feishu_url || '',
      });
    } else {
      setEditingWorkshop(null);
      setFormData({
        title: '',
        description: '',
        cover_image: '',
        event_date: format(new Date(), 'yyyy-MM-dd'),
        feishu_url: '',
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    // P1 修复：使用 Zod 验证表单数据
    const validation = adminWorkshopSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError?.message || '表单验证失败');
      return;
    }

    setSaving(true);

    try {
      const workshopFormData = {
        title: formData.title,
        description: formData.description || '',
        cover_image: formData.cover_image || '',
        start_date: formData.event_date,
        end_date: formData.event_date,
        feishu_url: formData.feishu_url || '',
        is_published: true,
      };

      if (editingWorkshop) {
        const result = await updateWorkshop(editingWorkshop.id, workshopFormData);
        if (!result.success) {
          toast.error(result.error ?? '更新失败，请稍后重试');
        } else {
          toast.success('活动已更新');
          setAuditRefreshKey(k => k + 1);
          setShowDialog(false);
          fetchWorkshops();
        }
      } else {
        const result = await createWorkshop(workshopFormData);
        if (!result.success) {
          toast.error(result.error ?? '创建失败，请稍后重试');
        } else {
          toast.success('活动创建成功');
          setAuditRefreshKey(k => k + 1);
          setShowDialog(false);
          fetchWorkshops();
        }
      }
    } catch (error) {
      logger.error('handleSave error:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (workshop: Workshop) => {
    const result = await setWorkshopActive(workshop.id, !workshop.is_active);
    if (!result.success) {
      toast.error(result.error ?? '操作失败');
    } else {
      setWorkshops(
        workshops.map((w) =>
          w.id === workshop.id ? { ...w, is_active: !w.is_active } : w
        )
      );
      toast.success(workshop.is_active ? '已关闭' : '已开启');
      setAuditRefreshKey(k => k + 1);
    }
  };

  const handleDelete = async (workshopId: string) => {
    const confirmed = await confirm({
      title: '删除活动',
      description: '确定要删除这个活动吗？所有打卡记录也会被删除。此操作无法撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const result = await deleteWorkshop(workshopId);
    if (!result.success) {
      toast.error(result.error ?? '删除失败，请稍后重试');
    } else {
      setWorkshops(workshops.filter((w) => w.id !== workshopId));
      toast.success('活动已删除');
      setAuditRefreshKey(k => k + 1);
    }
  };

  const filteredWorkshops = workshops.filter((workshop) =>
    workshop.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {ConfirmDialogComponent}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">活动管理</h1>
          <p className="text-muted-foreground mt-1">共 {workshops.length} 个活动</p>
        </div>
        <div className="flex items-center gap-2">
          <ResourceAuditLog resourceType="workshop" refreshKey={auditRefreshKey} />
          <Button
            className="bg-gradient-to-r from-primary to-primary/80"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="w-4 h-4 mr-2" />
            创建活动
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="搜索活动..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Workshop List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredWorkshops.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? '没有找到匹配的活动' : '还没有创建活动'}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              创建第一个活动
            </Button>
          )}
        </div>
      ) : (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {filteredWorkshops.map((workshop, index) => (
            <m.div
              key={workshop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Cover */}
                    <div className="relative w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden">
                      {workshop.cover_image ? (
                        <Image
                          src={workshop.cover_image}
                          alt={workshop.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CalendarDays className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate">
                          {workshop.title}
                        </h3>
                        <Badge variant={workshop.is_active ? 'default' : 'secondary'}>
                          {workshop.is_active ? '进行中' : '已关闭'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4" />
                          {format(new Date(workshop.event_date), 'yyyy年MM月dd日', { locale: zhCN })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {workshop.checkin_count || 0} 人打卡
                        </div>
                        {workshop.feishu_url && (
                          <div className="flex items-center gap-1 text-primary">
                            <ExternalLink className="w-4 h-4" />
                            <span>已配置链接</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(workshop)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(workshop)}
                          >
                            {workshop.is_active ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                关闭活动
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                开启活动
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(workshop.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除活动
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </m.div>
          ))}
        </m.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) setSaving(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorkshop ? '编辑活动' : '创建新活动'}
            </DialogTitle>
            <DialogDescription>
              填写活动信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">活动标题 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="输入活动标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">活动日期 *</Label>
              <Input
                id="date"
                type="date"
                value={formData.event_date}
                onChange={(e) =>
                  setFormData({ ...formData, event_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">活动简介</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="输入活动简介"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>封面图片</Label>
              <ImageUpload
                onUpload={(url) => setFormData({ ...formData, cover_image: url })}
                existingUrl={formData.cover_image}
                folder="covers"
                autoUpload
                aspectRatio="video"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feishu_url">飞书链接</Label>
              <Input
                id="feishu_url"
                value={formData.feishu_url}
                onChange={(e) =>
                  setFormData({ ...formData, feishu_url: e.target.value })
                }
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                用户点击活动卡片将直接跳转到此链接
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : editingWorkshop ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
