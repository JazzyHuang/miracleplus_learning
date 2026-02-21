'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sparkles, Plus, Loader2, ImageDown } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';
import { setAIToolActive, setAIToolFeatured, deleteAITool } from '@/app/actions/admin-ai-tools';
import { createAIToolsService } from '@/lib/ai-tools';
import { Button } from '@/components/ui/button';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import { DataTable } from '@/components/admin/data-table';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { AIToolFormDialog } from './ai-tool-form-dialog';
import { getAIToolColumns } from './ai-tool-columns';
import type { AITool, ToolCategory } from '@/types/database';

export function AIToolTable() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<AITool | null>(null);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [batchFetching, setBatchFetching] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const service = createAIToolsService(supabase);
      const [toolsData, catsData] = await Promise.all([
        service.getAllToolsAdmin(),
        service.getAllCategoriesAdmin(),
      ]);
      setTools(toolsData);
      setCategories(catsData);
    } catch {
      toast.error('加载工具列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEdit = useCallback((tool: AITool) => {
    setEditingTool(tool);
    setShowDialog(true);
  }, []);

  const handleToggleActive = useCallback(async (tool: AITool) => {
    const result = await setAIToolActive(tool.id, !tool.is_active);
    if (!result.success) { toast.error(result.error ?? '操作失败'); return; }
    setTools((prev) => prev.map((t) => t.id === tool.id ? { ...t, is_active: !t.is_active } : t));
    toast.success(tool.is_active ? '已下架' : '已上架');
    setAuditRefreshKey((k) => k + 1);
  }, []);

  const handleToggleFeatured = useCallback(async (tool: AITool) => {
    const result = await setAIToolFeatured(tool.id, !tool.is_featured);
    if (!result.success) { toast.error(result.error ?? '操作失败'); return; }
    setTools((prev) => prev.map((t) => t.id === tool.id ? { ...t, is_featured: !t.is_featured } : t));
    toast.success(tool.is_featured ? '已取消精选' : '已设为精选');
    setAuditRefreshKey((k) => k + 1);
  }, []);

  const handleDelete = useCallback(async (toolId: string) => {
    const confirmed = await confirm({
      title: '删除工具',
      description: '确定要删除这个 AI 工具吗？相关评分、灵感碎片等数据也会被删除。此操作无法撤销。',
      confirmText: '删除', cancelText: '取消', variant: 'destructive',
    });
    if (!confirmed) return;
    const result = await deleteAITool(toolId);
    if (!result.success) { toast.error(result.error ?? '删除失败'); return; }
    setTools((prev) => prev.filter((t) => t.id !== toolId));
    toast.success('工具已删除');
    setAuditRefreshKey((k) => k + 1);
  }, [confirm]);

  const handleBatchFetchImages = useCallback(async () => {
    setBatchFetching(true);
    try {
      const res = await fetch('/api/admin/batch-fetch-images', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || '批量获取失败'); return; }
      if (data.updated > 0) { toast.success(`已更新 ${data.updated} 个工具的图片`); fetchData(); }
      else { toast.info('所有工具图片已完整，无需更新'); }
      if (data.failed > 0) { toast.warning(`${data.failed} 个工具获取失败`); }
    } catch (error) { logger.error('Batch fetch images failed:', error); toast.error('网络错误'); }
    finally { setBatchFetching(false); }
  }, [fetchData]);

  const columns = useMemo(
    () => getAIToolColumns({ onEdit: handleEdit, onToggleActive: handleToggleActive, onToggleFeatured: handleToggleFeatured, onDelete: handleDelete }),
    [handleEdit, handleToggleActive, handleToggleFeatured, handleDelete]
  );

  const handleFormSuccess = useCallback(() => {
    fetchData();
    setAuditRefreshKey((k) => k + 1);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
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
              <Sparkles className="w-6 h-6" /> AI 工具管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">共 {tools.length} 款工具</p>
          </div>
          <div className="flex items-center gap-2">
            <ResourceAuditLog resourceType="ai_tool" refreshKey={auditRefreshKey} />
            <Button variant="outline" onClick={handleBatchFetchImages} disabled={batchFetching}>
              {batchFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageDown className="w-4 h-4 mr-2" />}
              批量获取图片
            </Button>
            <Button onClick={() => { setEditingTool(null); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> 添加工具
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={tools}
          searchColumn="name"
          searchPlaceholder="搜索工具名称..."
          pageSize={20}
          emptyState={{
            icon: Sparkles,
            title: '还没有添加工具',
            action: { label: '添加第一个工具', onClick: () => { setEditingTool(null); setShowDialog(true); } },
          }}
        />
      </div>

      <AIToolFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        tool={editingTool}
        categories={categories}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}
