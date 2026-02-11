'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { ShoppingBag, Star, Package, Clock, Gift, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createRewardsService, type RewardItem, type RewardOrder } from '@/lib/rewards/service';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';

interface ShopContentProps {
  userId: string;
}

const CATEGORIES = [
  { id: '', label: '全部' },
  { id: 'merchandise', label: '文创产品' },
  { id: 'membership', label: '会员权益' },
  { id: 'experience', label: '专属体验' },
] as const;

export function ShopContent({ userId }: ShopContentProps) {
  const [activeCategory, setActiveCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop');
  const [redeemItem, setRedeemItem] = useState<RewardItem | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const supabase = createClient();
  const rewardsService = createRewardsService(supabase);

  // Fetch reward items
  const { data: items, loading: itemsLoading, refetch: refetchItems } = useCachedQuery<RewardItem[]>(
    `shop-items-${activeCategory}`,
    () => rewardsService.getRewardItems(activeCategory || undefined),
    { ttl: 60000 }
  );

  // Fetch user orders
  const { data: orders, refetch: refetchOrders } = useCachedQuery<RewardOrder[]>(
    `shop-orders-${userId}`,
    () => rewardsService.getUserOrders(userId),
    { ttl: 30000, enabled: activeTab === 'orders' }
  );

  // Fetch user points
  const { data: pointBalance } = useCachedQuery<{ available_points: number }>(
    `user-points-${userId}`,
    async () => {
      const { data } = await supabase
        .from(DB.user_point_balance)
        .select('available_points')
        .eq('user_id', userId)
        .single();
      return data ?? { available_points: 0 };
    },
    { ttl: 15000 }
  );

  const handleRedeem = useCallback(async () => {
    if (!redeemItem) return;
    setIsRedeeming(true);
    try {
      const result = await rewardsService.redeemReward(userId, redeemItem.id);
      if (result.success) {
        toast.success(`成功兑换: ${redeemItem.name}`);
        invalidateCacheByPrefix('shop-');
        invalidateCacheByPrefix('user-points-');
        refetchItems();
        refetchOrders();
      } else {
        toast.error(result.error || '兑换失败');
      }
    } catch {
      toast.error('兑换失败，请稍后再试');
    } finally {
      setIsRedeeming(false);
      setRedeemItem(null);
    }
  }, [redeemItem, userId, rewardsService, refetchItems, refetchOrders]);

  const availablePoints = pointBalance?.available_points ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="积分商城"
        description="使用积分兑换精选奖品和专属体验"
        icon={ShoppingBag}
      />

      {/* Points balance card */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-5 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">可用积分</p>
          <p className="text-3xl font-bold text-card-foreground">{availablePoints}</p>
        </div>
      </m.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border/50 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'shop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground'
          }`}
        >
          <Gift className="w-4 h-4" />
          兑换商品
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'orders' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          我的订单
        </button>
      </div>

      {activeTab === 'shop' && (
        <>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-card-foreground border border-border/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items grid */}
          {itemsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3 animate-pulse shadow-sm">
                  <div className="h-40 rounded-lg bg-muted" />
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : !items || items.length === 0 ? (
            <EmptyState
              title="暂无商品"
              description="商城正在筹备中，敬请期待"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, index) => (
                <m.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm"
                >
                  {/* Image */}
                  <div className="relative h-44 bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <Gift className="w-16 h-16 text-muted-foreground" />
                    )}
                    {item.isFeatured && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-warning/90 text-xs font-medium text-card-foreground">
                        推荐
                      </div>
                    )}
                    {item.stock <= 3 && item.stock > 0 && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-destructive/90 text-xs font-medium text-card-foreground">
                        仅剩{item.stock}件
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-medium text-card-foreground truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-warning" />
                        <span className="font-bold text-warning">{item.pointsCost}</span>
                        <span className="text-xs text-muted-foreground/70">积分</span>
                      </div>
                      <Button
                        size="sm"
                        variant={availablePoints >= item.pointsCost && item.stock > 0 ? 'brand' : 'outline'}
                        disabled={availablePoints < item.pointsCost || item.stock <= 0}
                        onClick={() => setRedeemItem(item)}
                      >
                        {item.stock <= 0 ? '已售罄' : availablePoints < item.pointsCost ? '积分不足' : '立即兑换'}
                      </Button>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'orders' && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
          {!orders || orders.length === 0 ? (
            <EmptyState
              title="暂无订单"
              description="兑换商品后订单会显示在这里"
            />
          ) : (
            <div className="divide-y divide-border/30">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      order.status === 'completed' ? 'bg-success/10' :
                      order.status === 'cancelled' ? 'bg-destructive/10' :
                      'bg-warning/10'
                    }`}>
                      {order.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : order.status === 'cancelled' ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Clock className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{order.itemName}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {new Date(order.createdAt).toLocaleDateString('zh-CN')} · {order.pointsSpent} 积分
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'completed' ? 'bg-success/10 text-success' :
                      order.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                      order.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {order.status === 'pending' ? '待处理' :
                       order.status === 'processing' ? '处理中' :
                       order.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Redeem confirmation dialog */}
      {redeemItem && (
        <ConfirmDialog
          open={!!redeemItem}
          onOpenChange={(open) => { if (!open) setRedeemItem(null); }}
          onConfirm={handleRedeem}
          title="确认兑换"
          description={`确定使用 ${redeemItem.pointsCost} 积分兑换「${redeemItem.name}」吗？兑换后剩余 ${availablePoints - redeemItem.pointsCost} 积分。`}
          confirmText={isRedeeming ? '兑换中...' : '确认兑换'}
          variant="default"
        />
      )}
    </div>
  );
}
