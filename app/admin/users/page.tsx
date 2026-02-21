'use client';

import { useState, useCallback } from 'react';
import { Users, Search, Star, Shield, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { awardAdminPointsAction } from '@/app/actions/points';
import { updateUserRoleAction } from '@/app/actions/admin';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { useDebounce } from '@/hooks/use-debounce';
import { useUser } from '@/contexts/user-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import { getUserLevel } from '@/lib/points/config';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  point_balance: { total_points: number; level: number } | null;
  streak: { current_streak: number } | null;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(0);
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [exporting, setExporting] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    userId: string;
    userName: string;
    newRole: 'admin' | 'user';
  } | null>(null);

  const { user: currentUser } = useUser();

  const supabase = createClient();

  const { data: users, refetch } = useCachedQuery<UserRow[]>(
    `admin-users-${debouncedSearch}-p${page}`,
    async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from(DB.users)
        .select(`id, name, email, avatar_url, role, created_at, point_balance:${DB.user_point_balance}(total_points, level), streak:${DB.user_streaks}(current_streak)`)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (debouncedSearch) {
        const escaped = debouncedSearch.replace(/[%_\\]/g, '\\$&');
        query = query.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
      }
      const { data } = await query;
      return (data as unknown as UserRow[]) ?? [];
    },
    { ttl: 10000 }
  );

  const handleAdjustPoints = useCallback(async () => {
    if (!adjustUserId || !adjustPoints) return;
    const points = parseInt(adjustPoints);
    if (isNaN(points) || points === 0) { toast.error('请输入有效的积分值'); return; }
    await awardAdminPointsAction(
      adjustUserId,
      points > 0 ? 'BADGE_REWARD' : 'SPEND',
      points,
      undefined,
      'admin_adjustment',
      `管理员调整积分 ${points > 0 ? '+' : ''}${points}`
    );
    invalidateCacheByPrefix('admin-users');
    refetch();
    setAdjustUserId(null);
    setAdjustPoints('');
    toast.success(`积分已调整 ${points > 0 ? '+' : ''}${points}`);
    setAuditRefreshKey(k => k + 1);
  }, [adjustUserId, adjustPoints, refetch]);

  // 导出用户数据
  const handleExport = useCallback(async () => {
    setExporting(true);
    toast.loading('正在导出...', { id: 'export' });

    try {
      // 调用 API 路由进行导出
      const response = await fetch('/api/admin/export/users?format=csv');

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 获取文件内容
      const csv = await response.text();

      // 创建下载链接
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('导出成功', { id: 'export' });
    } catch {
      toast.error('导出失败', { id: 'export' });
    } finally {
      setExporting(false);
    }
  }, []);

  const handleRoleChange = useCallback(async () => {
    if (!roleChangeTarget) return;
    const result = await updateUserRoleAction(roleChangeTarget.userId, roleChangeTarget.newRole);
    if (result.success) {
      toast.success(
        roleChangeTarget.newRole === 'admin'
          ? `已将「${roleChangeTarget.userName}」提升为管理员`
          : `已将「${roleChangeTarget.userName}」降级为普通用户`
      );
      invalidateCacheByPrefix('admin-users');
      refetch();
      setAuditRefreshKey(k => k + 1);
    } else {
      toast.error(result.error ?? '操作失败');
      throw new Error(result.error ?? '操作失败');
    }
  }, [roleChangeTarget, refetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> 用户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">查看和管理平台用户</p>
        </div>
        <div className="flex items-center gap-2">
          <ResourceAuditLog resourceType="user" refreshKey={auditRefreshKey} />
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? '导出中...' : '导出用户'}
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="搜索用户名或邮箱..."
          aria-label="搜索用户"
          className="pl-10" />
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">用户</th>
            <th className="text-center p-3 font-medium">等级</th>
            <th className="text-right p-3 font-medium">积分</th>
            <th className="text-right p-3 font-medium">连续登录</th>
            <th className="text-center p-3 font-medium">角色</th>
            <th className="text-right p-3 font-medium">操作</th>
          </tr></thead>
          <tbody>
            {(users ?? []).map(u => {
              const points = (u.point_balance as unknown as { total_points: number } | null)?.total_points ?? 0;
              const level = getUserLevel(points);
              const streak = (u.streak as unknown as { current_streak: number } | null)?.current_streak ?? 0;
              return (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{u.name?.[0] ?? 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.name ?? '未设置'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{level.name}</span></td>
                  <td className="p-3 text-right font-medium">{points}</td>
                  <td className="p-3 text-right text-muted-foreground">{streak}天</td>
                  <td className="p-3 text-center">
                    {u.role === 'admin' ? (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentUser?.id === u.id}
                        aria-label={currentUser?.id === u.id ? '不能降级自己' : `将 ${u.name ?? u.email} 降级为普通用户`}
                        onClick={() => setRoleChangeTarget({ userId: u.id, userName: u.name ?? u.email, newRole: 'user' })}
                      >
                        <Shield className="w-3 h-3" />
                        管理员
                      </button>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                        aria-label={`将 ${u.name ?? u.email} 提升为管理员`}
                        onClick={() => setRoleChangeTarget({ userId: u.id, userName: u.name ?? u.email, newRole: 'admin' })}
                      >
                        用户
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {adjustUserId === u.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} type="number" placeholder="±积分"
                          aria-label="调整积分数值"
                          className="w-20 h-7 px-2 text-xs" />
                        <Button size="sm" className="h-7 text-xs" onClick={handleAdjustPoints}>确认</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdjustUserId(null)}>取消</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setAdjustUserId(u.id)}>
                        <Star className="w-3 h-3" /> 调分
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!users || users.length === 0) && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">未找到用户</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          第 {page + 1} 页 {users ? `(${users.length} 条)` : ''}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> 上一页
          </Button>
          <Button variant="outline" size="sm" disabled={!users || users.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
            下一页 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Role Change Confirmation Dialog */}
      <ConfirmDialog
        open={!!roleChangeTarget}
        onOpenChange={(open) => { if (!open) setRoleChangeTarget(null); }}
        title={roleChangeTarget?.newRole === 'admin' ? '提升为管理员' : '降级为普通用户'}
        description={
          roleChangeTarget?.newRole === 'admin'
            ? `确定要将「${roleChangeTarget?.userName}」提升为管理员吗？该用户将获得所有管理权限，包括课程管理、用户管理、内容审核等。`
            : `确定要将「${roleChangeTarget?.userName}」降级为普通用户吗？该用户将失去所有管理权限。`
        }
        variant={roleChangeTarget?.newRole === 'admin' ? 'warning' : 'destructive'}
        confirmText={roleChangeTarget?.newRole === 'admin' ? '确认提升' : '确认降级'}
        onConfirm={handleRoleChange}
      />
    </div>
  );
}
