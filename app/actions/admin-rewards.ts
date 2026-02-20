'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { createAuditLogService } from '@/lib/admin/audit-service';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { uuidSchema } from '@/lib/validations';
import { DB } from '@/lib/db-tables';
import { type ActionResult, rateLimited } from '@/lib/action-result';

/**
 * 检查管理员权限并返回 Supabase 客户端和审计服务
 */
async function requireAdmin() {
  const supabase = await createClient();
  const { isAdmin, user } = await checkAdminAccess(supabase);

  if (!user) {
    throw new Error('未登录');
  }

  if (!isAdmin) {
    throw new Error('无权限执行此操作');
  }

  const auditService = await createAuditLogService(user.id);

  return { supabase, user, auditService };
}

/**
 * 管理端操作限流检查
 */
async function checkAdminRateLimit<T = void>(userId: string): Promise<ActionResult<T> | null> {
  const result = await checkRateLimit(`admin-action:${userId}`, RATE_LIMITS.adminAction);
  if (!result.success) {
    return rateLimited<T>(result.retryAfter ?? 60);
  }
  return null;
}

/**
 * 校验资源 ID 格式
 */
function validateId<T = void>(id: string): ActionResult<T> | null {
  const result = uuidSchema.safeParse(id);
  if (!result.success) {
    return { success: false, error: '无效的资源 ID' };
  }
  return null;
}

// ==================== 商品操作 ====================

/**
 * 切换商品上架/下架状态
 */
export async function toggleRewardActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const idError = validateId(id);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 获取当前状态用于审计
    const { data: before } = await supabase
      .from(DB.reward_items)
      .select('is_active')
      .eq('id', id)
      .single();

    if (!before) {
      return { success: false, error: '商品不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.reward_items)
      .update({ is_active: !isActive })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure('UPDATE', 'reward', error.message, id);
      logger.error('toggleRewardActive failed:', error);
      return { success: false, error: '操作失败，请稍后重试' };
    }

    await auditService.logSuccess('UPDATE', 'reward', id, {
      beforeData: { is_active: isActive },
      afterData: { is_active: !isActive },
      description: isActive ? '下架了商品' : '上架了商品',
    });
    logger.info('Admin action', { action: 'toggleRewardActive', adminId: user.id, resourceId: id });
    revalidateTag('rewards');
    return { success: true };
  } catch (error) {
    logger.error('toggleRewardActive error:', error);
    return { success: false, error: error instanceof Error ? error.message : '操作失败' };
  }
}

/**
 * 删除商品
 */
export async function deleteRewardItem(id: string): Promise<ActionResult> {
  try {
    const idError = validateId(id);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 先获取商品信息用于审计
    const { data: before } = await supabase
      .from(DB.reward_items)
      .select('name, category, points_cost')
      .eq('id', id)
      .single();

    if (!before) {
      return { success: false, error: '商品不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.reward_items)
      .delete()
      .eq('id', id);

    if (error) {
      await auditService.logFailure('DELETE', 'reward', error.message, id);
      logger.error('deleteRewardItem failed:', error);
      return { success: false, error: '删除商品失败，请稍后重试' };
    }

    await auditService.logSuccess('DELETE', 'reward', id, {
      beforeData: { name: before.name, category: before.category, points_cost: before.points_cost },
      description: `删除了商品「${before.name}」`,
    });
    logger.info('Admin action', { action: 'deleteRewardItem', adminId: user.id, resourceId: id });
    revalidateTag('rewards');
    return { success: true };
  } catch (error) {
    logger.error('deleteRewardItem error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

// ==================== 订单操作 ====================

/**
 * 更新兑换订单状态
 */
export async function updateRewardOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  try {
    const idError = validateId(orderId);
    if (idError) return idError;

    const VALID_ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'] as const;
    if (!VALID_ORDER_STATUSES.includes(status as typeof VALID_ORDER_STATUSES[number])) {
      return { success: false, error: '无效的订单状态' };
    }

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 获取当前订单状态用于审计
    const { data: before } = await supabase
      .from(DB.reward_orders)
      .select('status')
      .eq('id', orderId)
      .single();

    if (!before) {
      return { success: false, error: '订单不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.reward_orders)
      .update({ status })
      .eq('id', orderId)
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure('UPDATE', 'reward', error.message, orderId);
      logger.error('updateRewardOrderStatus failed:', error);
      return { success: false, error: '更新订单状态失败，请稍后重试' };
    }

    const statusLabel = status === 'completed' ? '已完成' : status === 'cancelled' ? '已取消' : status;

    await auditService.logSuccess('UPDATE', 'reward', orderId, {
      beforeData: { status: before.status },
      afterData: { status },
      description: `更新订单状态为${statusLabel}`,
    });
    logger.info('Admin action', { action: 'updateRewardOrderStatus', adminId: user.id, resourceId: orderId });
    revalidateTag('rewards');
    return { success: true };
  } catch (error) {
    logger.error('updateRewardOrderStatus error:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}
