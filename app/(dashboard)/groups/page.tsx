'use client';

import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { Users, Plus, UserPlus, LogOut as LeaveIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';

interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  max_members: number;
  member_count: number;
  is_active: boolean;
  created_at: string;
  creator: { name: string | null; avatar_url: string | null } | null;
}

export default function GroupsPage() {
  const { user } = useUser();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const supabase = createClient();

  // DB.study_groups / DB.study_group_members not in generated types
  const groupsTable = useCallback(() => supabase.from(DB.study_groups), [supabase]);
  const membersTable = useCallback(() => supabase.from(DB.study_group_members), [supabase]);

  const { data: groups, refetch } = useCachedQuery<StudyGroup[]>(
    'study-groups',
    async () => {
      const { data } = await groupsTable()
        .select('*, creator:users!creator_id(name, avatar_url)')
        .eq('is_active', true)
        .order('member_count', { ascending: false });
      return (data as unknown as StudyGroup[]) ?? [];
    },
    { ttl: 30000 }
  );

  const { data: myMemberships } = useCachedQuery<string[]>(
    `my-groups-${user?.id}`,
    async () => {
      if (!user) return [];
      const { data } = await membersTable().select('group_id').eq('user_id', user.id);
      return (data ?? []).map((d: { group_id: string }) => d.group_id);
    },
    { ttl: 30000, enabled: !!user }
  );

  const { data: userPoints } = useCachedQuery<number>(
    `user-total-points-${user?.id}`,
    async () => {
      if (!user) return 0;
      const { data } = await supabase.from(DB.user_point_balance).select('total_points').eq('user_id', user.id).single();
      return data?.total_points ?? 0;
    },
    { ttl: 60000, enabled: !!user }
  );

  const canCreate = (userPoints ?? 0) >= 300; // AI实践家以上
  const memberSet = new Set(myMemberships ?? []);

  const handleCreate = useCallback(async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      const { data: group, error } = await groupsTable().insert({
        name: newName.trim(), description: newDesc.trim() || null, creator_id: user.id,
      }).select().single();
      if (error) throw error;
      // Auto-join as admin
      await membersTable().insert({ group_id: group.id, user_id: user.id, role: 'admin' });
      toast.success('小组创建成功');
      setShowCreate(false); setNewName(''); setNewDesc('');
      invalidateCacheByPrefix('study-groups'); invalidateCacheByPrefix('my-groups'); refetch();
    } catch { toast.error('创建失败'); }
    finally { setCreating(false); }
  }, [user, newName, newDesc, groupsTable, membersTable, refetch]);

  const handleJoin = useCallback(async (groupId: string) => {
    if (!user) return;
    try {
      await membersTable().insert({ group_id: groupId, user_id: user.id });
      toast.success('已加入小组');
      invalidateCacheByPrefix('study-groups'); invalidateCacheByPrefix('my-groups'); refetch();
    } catch { toast.error('加入失败'); }
  }, [user, membersTable, refetch]);

  const handleLeave = useCallback(async (groupId: string) => {
    if (!user) return;
    await membersTable().delete().eq('group_id', groupId).eq('user_id', user.id);
    toast.success('已退出小组');
    invalidateCacheByPrefix('study-groups'); invalidateCacheByPrefix('my-groups'); refetch();
  }, [user, membersTable, refetch]);

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="学习小组" description="加入或创建学习小组，与同伴一起成长" icon={Users} />
        {user && canCreate && !showCreate && (
          <Button className="gap-2" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> 创建小组</Button>
        )}
      </div>

      {!canCreate && user && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm text-warning/80">
          达到 AI 实践家 (300+ 积分) 即可创建学习小组
        </div>
      )}

      {showCreate && (
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card shadow-sm p-5 space-y-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="小组名称"
            className="w-full h-10 px-3 rounded-lg bg-muted border border-border/50 text-card-foreground text-sm" />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="小组简介 (可选)"
            className="w-full h-20 px-3 py-2 rounded-lg bg-muted border border-border/50 text-card-foreground text-sm resize-none" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
            <Button disabled={!newName.trim() || creating} onClick={handleCreate}>{creating ? '创建中...' : '创建'}</Button>
          </div>
        </m.div>
      )}

      {(!groups || groups.length === 0) ? (
        <EmptyState title="暂无学习小组" description={canCreate ? '创建第一个学习小组吧' : '等待其他同学创建小组'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g, i) => {
            const isMember = memberSet.has(g.id);
            const isCreator = g.creator_id === user?.id;
            return (
              <m.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/50 bg-card shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-card-foreground">{g.name}</h3>
                    {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
                  </div>
                  {isMember && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">已加入</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{g.member_count}/{g.max_members} 成员</span>
                  <span>创建者: {g.creator?.name ?? '未知'}</span>
                </div>
                {user && !isMember && g.member_count < g.max_members && (
                  <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => handleJoin(g.id)}>
                    <UserPlus className="w-3.5 h-3.5" /> 加入小组
                  </Button>
                )}
                {isMember && !isCreator && (
                  <Button size="sm" variant="ghost" className="w-full gap-1 text-muted-foreground" onClick={() => handleLeave(g.id)}>
                    <LeaveIcon className="w-3.5 h-3.5" /> 退出小组
                  </Button>
                )}
              </m.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
