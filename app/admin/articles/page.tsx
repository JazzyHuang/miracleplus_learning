'use client';

import { useState, useCallback } from 'react';
import { Newspaper, Plus, Edit2, Trash2, EyeOff, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';

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

  const supabase = createClient();

  // Helper: DB.articles not in generated Supabase types
  const articlesTable = () => supabase.from(DB.articles);

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
        await articlesTable().update({ title: editTitle, content: editContent, type: editType }).eq('id', editId);
        toast.success('文章已更新');
      } else {
        await articlesTable().insert({ title: editTitle, content: editContent, type: editType, author_id: user?.id });
        toast.success('文章已创建');
      }
      invalidateCacheByPrefix('admin-articles');
      refetch();
      setShowEditor(false);
      setEditTitle(''); setEditContent(''); setEditId(null);
    } catch { toast.error('保存失败'); }
    finally { setSaving(false); }
  }, [editTitle, editContent, editType, editId, user, supabase, refetch]);

  const togglePublish = useCallback(async (id: string, isPublished: boolean) => {
    await articlesTable().update({
      is_published: !isPublished,
      published_at: !isPublished ? new Date().toISOString() : null,
    }).eq('id', id);
    invalidateCacheByPrefix('admin-articles');
    refetch();
    toast.success(isPublished ? '已取消发布' : '已发布');
  }, [supabase, refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    await articlesTable().delete().eq('id', deleteId);
    invalidateCacheByPrefix('admin-articles');
    refetch();
    setDeleteId(null);
    toast.success('文章已删除');
  }, [deleteId, supabase, refetch]);

  const startEdit = async (id: string) => {
    const { data } = await articlesTable().select('*').eq('id', id).single();
    if (data) {
      setEditId(id); setEditTitle(data.title); setEditContent(data.content); setEditType(data.type);
      setShowEditor(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="w-6 h-6" /> 文章管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理日报和月报文章</p>
        </div>
        <Button className="gap-2" onClick={() => { setShowEditor(true); setEditId(null); setEditTitle(''); setEditContent(''); }}>
          <Plus className="w-4 h-4" /> 新建文章
        </Button>
      </div>

      {showEditor && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex gap-3">
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="文章标题"
              className="flex-1 h-10 px-3 rounded-md border bg-background text-sm" />
            <select value={editType} onChange={e => setEditType(e.target.value as 'daily' | 'monthly')}
              className="h-10 px-3 rounded-md border bg-background text-sm">
              <option value="daily">日报</option>
              <option value="monthly">月报</option>
            </select>
          </div>
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="文章内容 (Markdown)"
            className="w-full h-48 px-3 py-2 rounded-md border bg-background text-sm resize-none font-mono" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEditor(false)}>取消</Button>
            <Button disabled={saving} onClick={handleSave}>{saving ? '保存中...' : editId ? '更新' : '创建'}</Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">标题</th>
            <th className="text-center p-3 font-medium">类型</th>
            <th className="text-right p-3 font-medium">阅读量</th>
            <th className="text-center p-3 font-medium">状态</th>
            <th className="text-right p-3 font-medium">操作</th>
          </tr></thead>
          <tbody>
            {(articles ?? []).map(a => (
              <tr key={a.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{a.title}</td>
                <td className="p-3 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{a.type === 'monthly' ? '月报' : '日报'}</span></td>
                <td className="p-3 text-right text-muted-foreground">{a.view_count}</td>
                <td className="p-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${a.is_published ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-500/10 text-zinc-500'}`}>{a.is_published ? '已发布' : '草稿'}</span></td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(a.id)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePublish(a.id, a.is_published)}>
                      {a.is_published ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {(!articles || articles.length === 0) && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">暂无文章</td></tr>}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }} onConfirm={handleDelete}
        title="删除文章" description="确定要删除这篇文章吗？" confirmText="删除" variant="destructive" />
    </div>
  );
}
