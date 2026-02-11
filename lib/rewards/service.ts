/**
 * 积分兑换商城服务
 * 
 * 提供商品查询、兑换、订单管理等功能
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { DB, RPC } from '@/lib/db-tables';

export interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  pointsCost: number;
  stock: number;
  maxPerUser: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export interface RewardOrder {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  pointsSpent: number;
  quantity: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  shippingInfo: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
}

/**
 * 积分兑换服务类
 */
export class RewardsService {
  constructor(private supabase: SupabaseClient) {}

  // DB.reward_items / DB.reward_orders not in generated Supabase types
  private items() { return this.supabase.from(DB.reward_items); }
  private orders() { return this.supabase.from(DB.reward_orders); }

  /**
   * 获取商品列表
   */
  async getRewardItems(category?: string): Promise<RewardItem[]> {
    let query = this.items()
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('points_cost', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('获取商品列表失败:', error);
      return [];
    }

    return (data || []).map(this.mapRewardItem);
  }

  /**
   * 获取单个商品详情
   */
  async getRewardItem(id: string): Promise<RewardItem | null> {
    const { data, error } = await this.items()
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRewardItem(data);
  }

  /**
   * 兑换商品
   */
  async redeemReward(
    userId: string,
    itemId: string,
    shippingInfo?: Record<string, unknown>
  ): Promise<{ success: boolean; order?: RewardOrder; error?: string }> {
    try {
      // 1. 获取商品信息
      const item = await this.getRewardItem(itemId);
      if (!item) {
        return { success: false, error: '商品不存在' };
      }
      if (!item.isActive) {
        return { success: false, error: '商品已下架' };
      }
      if (item.stock <= 0) {
        return { success: false, error: '商品已售罄' };
      }

      // 2. 检查用户兑换次数限制
      if (item.maxPerUser > 0) {
        const { count } = await this.orders()
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('item_id', itemId)
          .neq('status', 'cancelled');

        if ((count || 0) >= item.maxPerUser) {
          return { success: false, error: `该商品每人限兑${item.maxPerUser}次` };
        }
      }

      // 3. 检查积分余额
      const { data: balance } = await this.supabase
        .from(DB.user_point_balance)
        .select('available_points')
        .eq('user_id', userId)
        .single();

      if (!balance || balance.available_points < item.pointsCost) {
        return { success: false, error: '积分不足' };
      }

      // 4. 扣除积分
      const { error: pointsError } = await this.supabase.rpc(RPC.add_user_points, {
        p_user_id: userId,
        p_points: -item.pointsCost,
        p_action_type: 'SPEND',
        p_description: `兑换商品: ${item.name}`,
        p_reference_id: itemId,
        p_reference_type: 'reward_item',
      });

      if (pointsError) {
        logger.error('扣除积分失败:', pointsError);
        return { success: false, error: '积分扣除失败，请稍后再试' };
      }

      // 5. 创建订单
      const { data: order, error: orderError } = await this.orders()
        .insert({
          user_id: userId,
          item_id: itemId,
          points_spent: item.pointsCost,
          quantity: 1,
          status: 'pending',
          shipping_info: shippingInfo || null,
        })
        .select()
        .single();

      if (orderError) {
        logger.error('创建订单失败:', orderError);
        // 回滚积分
        await this.supabase.rpc(RPC.add_user_points, {
          p_user_id: userId,
          p_points: item.pointsCost,
          p_action_type: 'SPEND',
          p_description: `兑换失败退回: ${item.name}`,
          p_reference_id: itemId,
          p_reference_type: 'reward_item',
        });
        return { success: false, error: '创建订单失败' };
      }

      // 6. 减少库存
      await this.items()
        .update({ stock: item.stock - 1 })
        .eq('id', itemId);

      return {
        success: true,
        order: this.mapRewardOrder({ ...order, item_name: item.name }),
      };
    } catch (error) {
      logger.error('兑换商品失败:', error);
      return { success: false, error: '兑换失败，请稍后再试' };
    }
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(userId: string): Promise<RewardOrder[]> {
    const { data, error } = await this.orders()
      .select(`
        *,
        item:${DB.reward_items} (name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('获取订单列表失败:', error);
      return [];
    }

    return (data || []).map((d: Record<string, unknown>) =>
      this.mapRewardOrder({
        ...d,
        item_name: (d.item as { name: string } | null)?.name || '未知商品',
      })
    );
  }

  /**
   * 取消订单
   */
  async cancelOrder(userId: string, orderId: string): Promise<{ success: boolean; error?: string }> {
    // 获取订单
    const { data: order } = await this.orders()
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (!order) {
      return { success: false, error: '订单不存在' };
    }

    if (order.status !== 'pending') {
      return { success: false, error: '该订单状态不可取消' };
    }

    // 退回积分
    await this.supabase.rpc(RPC.add_user_points, {
      p_user_id: userId,
      p_points: order.points_spent,
      p_action_type: 'SPEND',
      p_description: '取消兑换退回积分',
      p_reference_id: orderId,
      p_reference_type: 'reward_order',
    });

    // 更新订单状态
    await this.orders()
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    // 恢复库存
    const { data: item } = await this.items()
      .select('stock')
      .eq('id', order.item_id)
      .single();

    if (item) {
      await this.items()
        .update({ stock: item.stock + 1 })
        .eq('id', order.item_id);
    }

    return { success: true };
  }

  private mapRewardItem(data: Record<string, unknown>): RewardItem {
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | null,
      imageUrl: data.image_url as string | null,
      category: data.category as string,
      pointsCost: data.points_cost as number,
      stock: data.stock as number,
      maxPerUser: data.max_per_user as number,
      isActive: data.is_active as boolean,
      isFeatured: data.is_featured as boolean,
      createdAt: data.created_at as string,
    };
  }

  private mapRewardOrder(data: Record<string, unknown>): RewardOrder {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      itemId: data.item_id as string,
      itemName: data.item_name as string,
      pointsSpent: data.points_spent as number,
      quantity: data.quantity as number,
      status: data.status as RewardOrder['status'],
      shippingInfo: data.shipping_info as Record<string, unknown> | null,
      notes: data.notes as string | null,
      createdAt: data.created_at as string,
    };
  }
}

export function createRewardsService(supabase: SupabaseClient) {
  return new RewardsService(supabase);
}
