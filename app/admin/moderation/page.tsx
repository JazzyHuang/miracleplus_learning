'use client';

import { useState, useCallback } from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { moderateContent } from '@/app/actions/admin-moderation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';

interface ModerationItem {
  id: string;
  type: 'experience' | 'case' | 'submission';
  content: string | null;
  title: string | null;
  status: string;
  created_at: string;
  user: { name: string | null; avatar_url: string | null } | null;
}

export default function AdminModerationPage() {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const supabase = createClient();

  const { data: items, refetch } = useCachedQuery<ModerationItem[]>(
    `admin-moderation-${filter}`,
    async () => {
      // Fetch from multiple tables and merge
      const [experiences, cases, submissions] = await Promise.all([
        supabase.from(DB.tool_experiences).select(`id, use_case, status, created_at, user:${DB.users}(name, avatar_url)`)
          .eq('status', filter).order('created_at', { ascending: false }).limit(20),
        supabase.from(DB.tool_cases).select(`id, title, status, created_at, user:${DB.users}(name, avatar_url)`)
          .eq('status', filter).order('created_at', { ascending: false }).limit(20),
        supabase.from(DB.workshop_submissions).select(`id, content, status, created_at, user:${DB.users}(name, avatar_url)`)
          .eq('status', filter).order('created_at', { ascending: false }).limit(20),
      ]);

      const merged: ModerationItem[] = [
        ...(experiences.data ?? []).map((e: Record<string, unknown>) => ({
          id: e.id as string, type: 'experience' as const, content: e.use_case as string, title: null,
          status: e.status as string, created_at: e.created_at as string,
          user: e.user as ModerationItem['user'],
        })),
        ...(cases.data ?? []).map((c: Record<string, unknown>) => ({
          id: c.id as string, type: 'case' as const, content: null, title: c.title as string,
          status: c.status as string, created_at: c.created_at as string,
          user: c.user as ModerationItem['user'],
        })),
        ...(submissions.data ?? []).map((s: Record<string, unknown>) => ({
          id: s.id as string, type: 'submission' as const, content: s.content as string, title: null,
          status: s.status as string, created_at: s.created_at as string,
          user: s.user as ModerationItem['user'],
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return merged;
    },
    { ttl: 10000 }
  );

  const handleAction = useCallback(async (item: ModerationItem, action: 'approved' | 'rejected') => {
    const result = await moderateContent(item.id, item.type, action);
    if (!result.success) {
      toast.error(result.error ?? '操作失败');
      return;
    }

    invalidateCacheByPrefix('admin-moderation');
    refetch();
    toast.success(action === 'approved' ? '已通过' : '已拒绝');
  }, [refetch]);

  const typeLabel = (t: string) => t === 'experience' ? '工具体验' : t === 'case' ? '应用案例' : 'Workshop作品';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> 内容审核</h1>
          <p className="text-sm text-muted-foreground mt-1">审核用户提交的内容</p>
        </div>
        <ResourceAuditLog resourceType={['experience', 'case', 'submission']} />
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md ${filter === f ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
            {f === 'pending' ? '待审核' : f === 'approved' ? '已通过' : '已拒绝'}
            {f === 'pending' && items && ` (${items.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(items ?? []).map(item => (
          <div key={`${item.type}-${item.id}`} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={item.user?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{item.user?.name?.[0] ?? 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{item.user?.name ?? '未知用户'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('zh-CN')}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{typeLabel(item.type)}</span>
            </div>
            <div className="text-sm">
              {item.title && <p className="font-medium">{item.title}</p>}
              {item.content && <p className="text-muted-foreground line-clamp-3">{item.content}</p>}
            </div>
            {filter === 'pending' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" className="gap-1" onClick={() => handleAction(item, 'approved')}>
                  <Check className="w-3.5 h-3.5" /> 通过
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleAction(item, 'rejected')}>
                  <X className="w-3.5 h-3.5" /> 拒绝
                </Button>
              </div>
            )}
          </div>
        ))}
        {(!items || items.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">暂无{filter === 'pending' ? '待审核' : ''}内容</div>
        )}
      </div>
    </div>
  );
}
