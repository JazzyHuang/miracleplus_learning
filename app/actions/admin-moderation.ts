'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { createAuditLogService } from '@/lib/admin/audit-service';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { uuidSchema } from '@/lib/validations';
import { DB } from '@/lib/db-tables';
import { type ActionResult, ok, fail, rateLimited } from '@/lib/action-result';
import { awardAdminPointsAction } from '@/app/actions/points';

async function requireAdmin() {
  const supabase = await createClient();
  const { isAdmin, user } = await checkAdminAccess(supabase);
  if (!isAdmin || !user) {
    throw new Error('无权限执行此操作');
  }
  const auditService = await createAuditLogService(user.id);
  return { supabase, user, auditService };
}

async function checkAdminRateLimit(userId: string): Promise<ActionResult | null> {
  const result = await checkRateLimit(`admin-action:${userId}`, RATE_LIMITS.adminAction);
  if (!result.success) {
    return rateLimited(result.retryAfter ?? 60);
  }
  return null;
}

type ModerationTarget = 'experience' | 'case' | 'submission';
type ModerationAction = 'approved' | 'rejected';

const TABLE_MAP: Record<ModerationTarget, string> = {
  experience: DB.tool_experiences,
  case: DB.tool_cases,
  submission: DB.workshop_submissions,
};

const LABEL_MAP: Record<ModerationTarget, string> = {
  experience: '工具体验',
  case: '应用案例',
  submission: 'Workshop作品',
};

/**
 * 审核内容（通过/拒绝）
 */
export async function moderateContent(
  itemId: string,
  targetType: ModerationTarget,
  action: ModerationAction
): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(itemId);
    if (!idResult.success) return fail('无效的资源 ID');

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    const table = TABLE_MAP[targetType];
    if (!table) return fail('无效的内容类型');

    const { error } = await supabase
      .from(table)
      .update({ status: action })
      .eq('id', itemId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return fail('内容不存在或已被删除');
      }
      await auditService.logFailure('UPDATE', targetType, error.message, itemId);
      logger.error('moderateContent failed:', error);
      return fail('操作失败，请稍后重试');
    }

    // Award points on approval for experiences and cases
    if (action === 'approved' && (targetType === 'case' || targetType === 'experience')) {
      const { data } = await supabase.from(table).select('user_id').eq('id', itemId).single();
      if (data?.user_id) {
        const actionType = targetType === 'case' ? 'TOOL_CASE' : 'TOOL_EXPERIENCE';
        const points = targetType === 'case' ? 100 : 30;
        await awardAdminPointsAction(data.user_id, actionType, points, itemId, table, '内容审核通过');
      }
    }

    await auditService.logSuccess('UPDATE', targetType, itemId, {
      after: { status: action, targetType, label: LABEL_MAP[targetType] },
    });
    logger.info('Admin action', { action: 'moderateContent', adminId: user.id, itemId, targetType, status: action });
    revalidateTag('moderation');
    return ok();
  } catch (error) {
    logger.error('moderateContent error:', error);
    return fail(error instanceof Error ? error.message : '操作失败');
  }
}
