'use client';

import { useState, useCallback } from 'react';
import { UserCheck, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { reviewInstructorApplication } from '@/app/actions/admin-instructors';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';

const PAGE_SIZE = 20;

interface InstructorApplication {
  id: string;
  user_id: string;
  topic: string;
  description: string | null;
  duration: number | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
  user: { name: string | null; email: string; avatar_url: string | null } | null;
}

export default function AdminInstructorsPage() {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [page, setPage] = useState(0);
  const supabase = createClient();

  const { data: applications, refetch } = useCachedQuery<InstructorApplication[]>(
    `admin-instructor-apps-${filter}-p${page}`,
    async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from(DB.instructor_applications)
        .select(`*, user:${DB.users}(name, email, avatar_url)`)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (filter !== 'all') query = query.eq('status', filter);
      const { data } = await query;
      return (data as unknown as InstructorApplication[]) ?? [];
    },
    { ttl: 10000 }
  );

  const handleReview = useCallback(async (id: string, status: 'approved' | 'rejected') => {
    const result = await reviewInstructorApplication(id, status);
    if (!result.success) {
      toast.error(result.error ?? '操作失败');
      return;
    }

    invalidateCacheByPrefix('admin-instructor');
    refetch();
    toast.success(status === 'approved' ? '已通过，讲师获得 400 积分' : '已拒绝');
  }, [refetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="w-6 h-6" /> 讲师审核</h1>
          <p className="text-sm text-muted-foreground mt-1">审核 Workshop 讲师申请</p>
        </div>
        <ResourceAuditLog resourceType="instructor_application" />
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(0); }}
            className={`px-3 py-1.5 text-sm rounded-md ${filter === f ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
            {f === 'pending' ? '待审核' : f === 'approved' ? '已通过' : f === 'rejected' ? '已拒绝' : '全部'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(applications ?? []).map(app => (
          <div key={app.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={app.user?.avatar_url ?? undefined} />
                  <AvatarFallback>{app.user?.name?.[0] ?? 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{app.user?.name ?? app.user?.email}</p>
                  <p className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString('zh-CN')}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' :
                app.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                'bg-amber-500/10 text-amber-600'
              }`}>{app.status === 'pending' ? '待审核' : app.status === 'approved' ? '已通过' : '已拒绝'}</span>
            </div>
            <div>
              <p className="font-medium">{app.topic}</p>
              {app.description && <p className="text-sm text-muted-foreground mt-1">{app.description}</p>}
              {app.duration && <p className="text-xs text-muted-foreground mt-1">时长: {app.duration} 分钟</p>}
            </div>
            {app.status === 'pending' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" className="gap-1" onClick={() => handleReview(app.id, 'approved')}>
                  <Check className="w-3.5 h-3.5" /> 通过
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleReview(app.id, 'rejected')}>
                  <X className="w-3.5 h-3.5" /> 拒绝
                </Button>
              </div>
            )}
          </div>
        ))}
        {(!applications || applications.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">暂无{filter === 'pending' ? '待审核' : ''}申请</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          第 {page + 1} 页 {applications ? `(${applications.length} 条)` : ''}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> 上一页
          </Button>
          <Button variant="outline" size="sm" disabled={!applications || applications.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
            下一页 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
