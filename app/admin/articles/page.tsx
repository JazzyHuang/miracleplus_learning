'use client';

import { useState, useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Newspaper, Plus, Edit2, Trash2, EyeOff, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import { DataTable } from '@/components/admin/data-table';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';
import {
  createArticle,
  updateArticle,
  deleteArticle,
  toggleArticlePublish,
} from '@/app/actions/admin-articles';

interface Article {
  id: string;
  title: string;
  type: string;
  is_published: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

export default function AdminArticlesPage() {
  const { user } = useUser();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<'daily' | 'monthly'>('daily');
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const supabase = createClient();

  // Helper: DB.articles not in generated Supabase types
  const articlesTable = useCallback(() => supabase.from(DB.articles), [supabase]);

  const { data: articles, refetch } = useCachedQuery<Article[]>(
    'admin-articles',
    async () => {
      const { data } = await articlesTable().select('id, title, type, is_published, view_count, published_at, created_at')
        .order('created_at', { ascending: false });
      return (data as Article[]) ?? [];
    },
    { ttl: 10000 }
  );

  const handleSave = useCallback(async () => {
    if (!editTitle.trim() || !editContent.trim()) { toast.error('标题和内容不能为空'); return; }
    setSaving(true);
    try {
      if (editId) {
        const result = await updateArticle(editId, { title: editTitle, content: editContent, type: editType });
        if (!result.success) { toast.error(result.error ?? '更新失败'); return; }
        toast.success('文章已更新');
        setAuditRefreshKey(k => k + 1);
      } else {
        const result = await createArticle({ title: editTitle, content: editContent, type: editType, author_id: user?.id ?? '' });
        if (!result.success) { toast.error(result.error ?? '创建失败'); return; }
        toast.success('文章已创建');
        setAuditRefreshKey(k => k + 1);
      }
      invalidateCacheByPrefix('admin-articles');
      refetch();
      setShowEditor(false);
      setEditTitle(''); setEditContent(''); setEditId(null);
    } catch { toast.error('保存失败'); }
    finally { setSaving(false); }
  }, [editTitle, editContent, editType, editId, user, refetch]);

  const togglePublish = useCallback(async (id: string, isPublished: boolean) => {
    const result = await toggleArticlePublish(id, isPublished);
    if (!result.success) { toast.error(result.error ?? '操作失败'); return; }
    invalidateCacheByPrefix('admin-articles');
    refetch();
    toast.success(isPublished ? '已取消发布' : '已发布');
    setAuditRefreshKey(k => k + 1);
  }, [refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const result = await deleteArticle(deleteId);
    if (!result.success) { toast.error(result.error ?? '删除失败'); return; }
    invalidateCacheByPrefix('admin-articles');
    refetch();
    setDeleteId(null);
    toast.success('文章已删除');
    setAuditRefreshKey(k => k + 1);
  }, [deleteId, refetch]);

  const startEdit = useCallback(async (id: string) => {
    const { data, error } = await articlesTable().select('*').eq('id', id).single();
    if (error || !data) {
      toast.error('加载文章内容失败');
      return;
    }
    setEditId(id); setEditTitle(data.title); setEditContent(data.content); setEditType(data.type);
    setShowEditor(true);
  }, [articlesTable]);

  const columns = useMemo<ColumnDef<Article, unknown>[]>(() => [
    { accessorKey: 'title', header: '标题', meta: { label: '标题' }, cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    {
      accessorKey: 'type', header: '类型', meta: { label: '类型' },
      cell: ({ row }) => <Badge variant="secondary">{row.original.type === 'monthly' ? '月报' : '日报'}</Badge>,
    },
    { accessorKey: 'view_count', header: '阅读量', meta: { label: '阅读量' }, cell: ({ row }) => <span className="text-muted-foreground">{row.original.view_count}</span> },
    {
      accessorKey: 'is_published', header: '状态', meta: { label: '状态' },
      cell: ({ row }) => (
        <Badge variant={row.original.is_published ? 'default' : 'secondary'}>
          {row.original.is_published ? '已发布' : '草稿'}
        </Badge>
      ),
    },
    {
      id: 'actions', header: '操作', meta: { label: '操作' }, enableSorting: false, enableHiding: false,
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="编辑文章" onClick={() => startEdit(a.id)}><Edit2 className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={a.is_published ? '取消发布' : '发布'} onClick={() => togglePublish(a.id, a.is_published)}>
              {a.is_published ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="删除文章" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        );
      },
    },
  ], [togglePublish, startEdit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="w-6 h-6" /> 文章管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理日报和月报文章</p>
        </div>
        <div className="flex items-center gap-2">
          <ResourceAuditLog resourceType="article" refreshKey={auditRefreshKey} />
          <Button className="gap-2" onClick={() => { setShowEditor(true); setEditId(null); setEditTitle(''); setEditContent(''); }}>
            <Plus className="w-4 h-4" /> 新建文章
          </Button>
        </div>
      </div>

      {showEditor && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex gap-3">
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="文章标题"
              aria-label="文章标题"
              className="flex-1" />
            <Select value={editType} onValueChange={v => setEditType(v as 'daily' | 'monthly')}>
              <SelectTrigger className="w-[100px]" aria-label="文章类型">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">日报</SelectItem>
                <SelectItem value="monthly">月报</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="文章内容 (Markdown)"
            aria-label="文章内容"
            className="h-48 resize-none font-mono" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEditor(false)}>取消</Button>
            <Button disabled={saving} onClick={handleSave}>{saving ? '保存中...' : editId ? '更新' : '创建'}</Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={articles ?? []}
        searchColumn="title"
        searchPlaceholder="搜索文章标题..."
        pageSize={20}
        emptyState={{ icon: Newspaper, title: '暂无文章' }}
      />

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }} onConfirm={handleDelete}
        title="删除文章" description="确定要删除这篇文章吗？" confirmText="删除" variant="destructive" />
    </div>
  );
}
