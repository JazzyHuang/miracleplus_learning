'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { setWorkshopActive, deleteWorkshop } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import { DataTable } from '@/components/admin/data-table';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { WorkshopFormDialog } from './workshop-form-dialog';
import { getWorkshopColumns, type WorkshopWithCount } from './workshop-columns';
import { DB } from '@/lib/db-tables';
import type { Workshop } from '@/types/database';

export function WorkshopTable() {
  const [workshops, setWorkshops] = useState<WorkshopWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const fetchWorkshops = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(DB.workshops)
        .select(`*, ${DB.workshop_checkins} (count)`)
        .order('event_date', { ascending: false });

      if (error) {
        toast.error('加载活动列表失败');
        return;
      }
      if (data) {
        type WorkshopQueryResult = Workshop & {
          [K in typeof DB.workshop_checkins]: Array<{ count: number }>;
        };
        setWorkshops(
          (data as WorkshopQueryResult[]).map((w) => ({
            ...w,
            checkin_count: (w[DB.workshop_checkins] as Array<{ count: number }>)?.[0]?.count || 0,
          }))
        );
      }
    } catch {
      toast.error('加载活动列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  const handleEdit = useCallback((workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setShowDialog(true);
  }, []);

  const handleToggleActive = useCallback(async (workshop: Workshop) => {
    const result = await setWorkshopActive(workshop.id, !workshop.is_active);
    if (!result.success) {
      toast.error(result.error ?? '操作失败');
      return;
    }
    setWorkshops((prev) =>
      prev.map((w) => (w.id === workshop.id ? { ...w, is_active: !w.is_active } : w))
    );
    toast.success(workshop.is_active ? '已关闭' : '已开启');
    setAuditRefreshKey((k) => k + 1);
  }, []);

  const handleDelete = useCallback(async (workshopId: string) => {
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
      toast.error(result.error ?? '删除失败');
      return;
    }
    setWorkshops((prev) => prev.filter((w) => w.id !== workshopId));
    toast.success('活动已删除');
    setAuditRefreshKey((k) => k + 1);
  }, [confirm]);

  const columns = useMemo(
    () => getWorkshopColumns({ onEdit: handleEdit, onToggleActive: handleToggleActive, onDelete: handleDelete }),
    [handleEdit, handleToggleActive, handleDelete]
  );

  const handleFormSuccess = useCallback(() => {
    fetchWorkshops();
    setAuditRefreshKey((k) => k + 1);
  }, [fetchWorkshops]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {ConfirmDialogComponent}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6" /> 活动管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">共 {workshops.length} 个活动</p>
          </div>
          <div className="flex items-center gap-2">
            <ResourceAuditLog resourceType="workshop" refreshKey={auditRefreshKey} />
            <Button onClick={() => { setEditingWorkshop(null); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> 创建活动
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={workshops}
          searchColumn="title"
          searchPlaceholder="搜索活动..."
          pageSize={20}
          emptyState={{
            icon: CalendarDays,
            title: '还没有创建活动',
            action: { label: '创建第一个活动', onClick: () => { setEditingWorkshop(null); setShowDialog(true); } },
          }}
        />
      </div>

      <WorkshopFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        workshop={editingWorkshop}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}
