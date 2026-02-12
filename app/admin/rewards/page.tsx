'use client';

import { useState, useCallback } from 'react';
import { ShoppingBag, Trash2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceAuditLog } from '@/components/admin/resource-audit-log';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';
import {
  toggleRewardActive,
  deleteRewardItem,
  updateRewardOrderStatus,
} from '@/app/actions/admin-rewards';

interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  points_cost: number;
  stock: number;
  max_per_user: number;
  is_active: boolean;
  is_featured: boolean;
}

interface RewardOrder {
  id: string;
  user_id: string;
  item_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  user: { name: string | null; email: string } | null;
  item: { name: string } | null;
}

export default function AdminRewardsPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'orders'>('items');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  const supabase = createClient();

  // DB.reward_items / DB.reward_orders not in generated Supabase types
  const itemsTable = useCallback(() => supabase.from(DB.reward_items), [supabase]);
  const ordersTable = useCallback(() => supabase.from(DB.reward_orders), [supabase]);

  const { data: items, refetch: refetchItems } = useCachedQuery<RewardItem[]>(
    'admin-reward-items',
    async () => {
      const { data } = await itemsTable().select('*').order('created_at', { ascending: false });
      return (data as RewardItem[]) ?? [];
    },
    { ttl: 10000 }
  );

  const { data: orders } = useCachedQuery<RewardOrder[]>(
    'admin-reward-orders',
    async () => {
      const { data } = await ordersTable()
        .select(`*, user:${DB.users}(name, email), item:${DB.reward_items}(name)`)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data as unknown as RewardOrder[]) ?? [];
    },
    { ttl: 10000, enabled: activeTab === 'orders' }
  );

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    const result = await toggleRewardActive(id, isActive);
    if (!result.success) { toast.error(result.error ?? '操作失败'); return; }
    invalidateCacheByPrefix('admin-reward');
    refetchItems();
    toast.success(isActive ? '已下架' : '已上架');
    setAuditRefreshKey(k => k + 1);
  }, [refetchItems]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const result = await deleteRewardItem(deleteId);
    if (!result.success) { toast.error(result.error ?? '删除失败'); return; }
    invalidateCacheByPrefix('admin-reward');
    refetchItems();
    setDeleteId(null);
    toast.success('商品已删除');
    setAuditRefreshKey(k => k + 1);
  }, [deleteId, refetchItems]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    const result = await updateRewardOrderStatus(orderId, status);
    if (!result.success) { toast.error(result.error ?? '操作失败'); return; }
    invalidateCacheByPrefix('admin-reward');
    toast.success('订单状态已更新');
    setAuditRefreshKey(k => k + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" /> 商品管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">管理积分兑换商城的商品和订单</p>
        </div>
        <ResourceAuditLog resourceType="reward" refreshKey={auditRefreshKey} />
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setActiveTab('items')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'items' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
          商品列表
        </button>
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'orders' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
          订单管理
        </button>
      </div>

      {activeTab === 'items' && (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">商品名称</th>
              <th className="text-left p-3 font-medium">分类</th>
              <th className="text-right p-3 font-medium">积分</th>
              <th className="text-right p-3 font-medium">库存</th>
              <th className="text-center p-3 font-medium">状态</th>
              <th className="text-right p-3 font-medium">操作</th>
            </tr></thead>
            <tbody>
              {(items ?? []).map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-muted-foreground">{item.category}</td>
                  <td className="p-3 text-right">{item.points_cost}</td>
                  <td className="p-3 text-right">{item.stock}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-500/10 text-zinc-500'}`}>
                      {item.is_active ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(item.id, item.is_active)}>
                        {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!items || items.length === 0) && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">暂无商品</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">用户</th>
              <th className="text-left p-3 font-medium">商品</th>
              <th className="text-right p-3 font-medium">积分</th>
              <th className="text-center p-3 font-medium">状态</th>
              <th className="text-right p-3 font-medium">操作</th>
            </tr></thead>
            <tbody>
              {(orders ?? []).map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">{order.user?.name ?? order.user?.email ?? '未知'}</td>
                  <td className="p-3">{order.item?.name ?? '未知商品'}</td>
                  <td className="p-3 text-right">{order.points_spent}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                      order.status === 'cancelled' ? 'bg-red-500/10 text-red-600' :
                      'bg-amber-500/10 text-amber-600'
                    }`}>{order.status === 'pending' ? '待处理' : order.status === 'completed' ? '已完成' : order.status === 'cancelled' ? '已取消' : '处理中'}</span>
                  </td>
                  <td className="p-3 text-right">
                    {order.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateOrderStatus(order.id, 'completed')}>完成</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateOrderStatus(order.id, 'cancelled')}>取消</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">暂无订单</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }} onConfirm={handleDelete}
        title="删除商品" description="确定要删除这个商品吗？此操作不可撤销。" confirmText="删除" variant="destructive" />
    </div>
  );
}
