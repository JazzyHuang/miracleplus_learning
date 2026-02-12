'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createPointsService } from '@/lib/points/service';
import { createBadgesService } from '@/lib/points/badges';
import { isAdmin } from '@/lib/supabase/auth';
import { DB } from '@/lib/db-tables';
import { logger } from '@/lib/logger';
import type { PointActionType } from '@/lib/points/config';

/**
 * 安全白名单：仅允许客户端直接触发的积分行为类型
 * 其余行为类型（COURSE_100_PERCENT、STREAK_100 等）只能由服务端内部逻辑触发
 */
const ALLOWED_CLIENT_ACTIONS: ReadonlySet<PointActionType> = new Set([
  'PROFILE_COMPLETE',
  'QUIZ_PERFECT',
  'DAILY_REVIEW',
  'NOTE_UPLOAD',
  'WORKSHOP_REVIEW',
  'ARTICLE_READ',
  'ARTICLE_READ_MONTHLY',
  'TOOL_COMPARISON',
]);

/**
 * 业务验证：针对每种 action 验证前置条件
 */
async function validateAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  actionType: PointActionType,
  referenceId?: string,
): Promise<{ valid: boolean; error?: string }> {
  switch (actionType) {
    case 'PROFILE_COMPLETE': {
      const { data: profile } = await supabase
        .from(DB.users)
        .select('name, avatar_url')
        .eq('id', userId)
        .single();
      if (!profile?.name?.trim()) {
        return { valid: false, error: '请先完善资料' };
      }
      return { valid: true };
    }

    case 'QUIZ_PERFECT': {
      if (!referenceId) return { valid: false, error: '缺少课程 ID' };
      const { data: lesson } = await supabase
        .from(DB.lessons)
        .select('id')
        .eq('id', referenceId)
        .single();
      if (!lesson) return { valid: false, error: '课程不存在' };
      return { valid: true };
    }

    case 'NOTE_UPLOAD': {
      if (!referenceId) return { valid: false, error: '缺少课程 ID' };
      return { valid: true };
    }

    case 'WORKSHOP_REVIEW': {
      if (!referenceId) return { valid: false, error: '缺少 Workshop ID' };
      // 性能优化：并行查询 workshop 和 checkin（消除串行等待）
      const [{ data: workshop }, { data: checkin }] = await Promise.all([
        supabase
          .from(DB.workshops)
          .select('id')
          .eq('id', referenceId)
          .single(),
        supabase
          .from(DB.workshop_checkins)
          .select('id')
          .eq('user_id', userId)
          .eq('workshop_id', referenceId)
          .maybeSingle(),
      ]);
      if (!workshop) return { valid: false, error: 'Workshop 不存在' };
      if (!checkin) return { valid: false, error: '请先签到' };
      return { valid: true };
    }

    case 'ARTICLE_READ':
    case 'ARTICLE_READ_MONTHLY': {
      if (!referenceId) return { valid: false, error: '缺少文章 ID' };
      const { data: article } = await supabase
        .from(DB.articles)
        .select('id')
        .eq('id', referenceId)
        .single();
      if (!article) return { valid: false, error: '文章不存在' };
      return { valid: true };
    }

    case 'TOOL_COMPARISON': {
      if (!referenceId) return { valid: false, error: '缺少对比 ID' };
      const { data: comparison } = await supabase
        .from(DB.tool_comparisons)
        .select('id')
        .eq('id', referenceId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!comparison) return { valid: false, error: '对比记录不存在或不属于当前用户' };
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/**
 * 服务端积分发放 Action
 * 安全修复：
 * 1. 白名单限制客户端可触发的行为类型，防止任意刷分
 * 2. 对允许的行为类型增加业务验证
 */
export async function awardPointsAction(
  actionType: PointActionType,
  referenceId?: string,
  referenceType?: string,
  description?: string
) {
  if (!ALLOWED_CLIENT_ACTIONS.has(actionType)) {
    logger.logSecurity('points_illegal_action_type', 'high', { actionType });
    return { success: false, newBalance: 0, pointsAdded: 0, error: '非法操作类型' };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, newBalance: 0, pointsAdded: 0, error: '未登录' };

    // 业务验证
    const validation = await validateAction(supabase, user.id, actionType, referenceId);
    if (!validation.valid) {
      return { success: false, newBalance: 0, pointsAdded: 0, error: validation.error };
    }

    const pointsService = createPointsService(supabase);
    const result = await pointsService.addPoints(user.id, actionType, referenceId, referenceType, description);

    if (result.success && result.pointsAdded > 0) {
      revalidateTag('leaderboard');
      revalidateTag('user-stats');
    }

    return result;
  } catch (error) {
    logger.error('awardPointsAction unexpected error', error, { actionType });
    return { success: false, newBalance: 0, pointsAdded: 0, error: '积分服务暂时不可用' };
  }
}

/**
 * Admin 专用积分发放 Action
 * 用于审核通过后给用户发放积分、管理员手动调分等场景
 */
export async function awardAdminPointsAction(
  targetUserId: string,
  actionType: PointActionType,
  _points: number,
  referenceId?: string,
  referenceType?: string,
  description?: string
) {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      logger.logSecurity('admin_points_unauthorized', 'high', { targetUserId, actionType });
      return { success: false, newBalance: 0, pointsAdded: 0, error: '无权限' };
    }

    const supabase = await createClient();
    const pointsService = createPointsService(supabase);
    const result = await pointsService.addPoints(targetUserId, actionType, referenceId, referenceType, description);

    if (result.success && result.pointsAdded > 0) {
      revalidateTag('leaderboard');
      revalidateTag('user-stats');
    }

    return result;
  } catch (error) {
    logger.error('awardAdminPointsAction unexpected error', error, { targetUserId, actionType });
    return { success: false, newBalance: 0, pointsAdded: 0, error: '积分服务暂时不可用' };
  }
}

/**
 * 服务端徽章检查 Action
 */
export async function checkBadgesAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const badgesService = createBadgesService(supabase);
    return badgesService.checkAndUnlockBadges(user.id);
  } catch (error) {
    logger.error('checkBadgesAction unexpected error', error);
    return [];
  }
}
