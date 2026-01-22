'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Workshop } from '@/types/database';

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
      .from('workshops')
      .select(`
        *,
        workshop_checkins (count)
      `)
      .order('event_date', { ascending: false });

    if (!error && data) {
      const workshopsWithCount = data.map((w: any) => ({
        ...w,
        checkin_count: w.workshop_checkins?.[0]?.count || 0,
      }));
      setWorkshops(workshopsWithCount);
    }
    setLoading(false);
  };

  useEffect(() => {
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
    if (!formData.title.trim()) {
      toast.error('请输入活动标题');
      return;
    }
    if (!formData.event_date) {
      toast.error('请选择活动日期');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const workshopData = {
      title: formData.title,
      description: formData.description || null,
      cover_image: formData.cover_image || null,
      event_date: formData.event_date,
      feishu_url: formData.feishu_url || null,
      is_active: true,
    };

    if (editingWorkshop) {
      const { error } = await supabase
        .from('workshops')
        .update(workshopData)
        .eq('id', editingWorkshop.id);

      if (error) {
        toast.error('更新失败：' + error.message);
      } else {
        toast.success('活动已更新');
        setShowDialog(false);
        fetchWorkshops();
        
        // Revalidate cache after updating workshop
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'workshops' }),
        });
      }
    } else {
      const { error } = await supabase.from('workshops').insert(workshopData);

      if (error) {
        toast.error('创建失败：' + error.message);
      } else {
        toast.success('活动创建成功');
        setShowDialog(false);
        fetchWorkshops();
        
        // Revalidate cache after creating workshop
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'workshops' }),
        });
      }
    }
    setSaving(false);
  };

  const handleToggleActive = async (workshop: Workshop) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('workshops')
      .update({ is_active: !workshop.is_active })
      .eq('id', workshop.id);

    if (error) {
      toast.error('操作失败');
    } else {
      setWorkshops(
        workshops.map((w) =>
          w.id === workshop.id ? { ...w, is_active: !w.is_active } : w
        )
      );
      toast.success(workshop.is_active ? '已关闭' : '已开启');
      
      // Revalidate cache after toggling active status
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'workshops' }),
      });
    }
  };

  const handleDelete = async (workshopId: string) => {
    if (!confirm('确定要删除这个活动吗？所有打卡记录也会被删除。')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('workshops')
      .delete()
      .eq('id', workshopId);

    if (error) {
      toast.error('删除失败：' + error.message);
    } else {
      setWorkshops(workshops.filter((w) => w.id !== workshopId));
      toast.success('活动已删除');
      
      // Revalidate cache after deleting workshop
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'workshops' }),
      });
    }
  };

  const filteredWorkshops = workshops.filter((workshop) =>
    workshop.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">活动管理</h1>
          <p className="text-muted-foreground mt-1">共 {workshops.length} 个活动</p>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-primary/80"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="w-4 h-4 mr-2" />
          创建活动
        </Button>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {filteredWorkshops.map((workshop, index) => (
            <motion.div
              key={workshop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Cover */}
                    <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {workshop.cover_image ? (
                        <img
                          src={workshop.cover_image}
                          alt={workshop.title}
                          className="w-full h-full object-cover"
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
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
              <Label htmlFor="cover">封面图片 URL</Label>
              <Input
                id="cover"
                value={formData.cover_image}
                onChange={(e) =>
                  setFormData({ ...formData, cover_image: e.target.value })
                }
                placeholder="输入图片 URL"
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
