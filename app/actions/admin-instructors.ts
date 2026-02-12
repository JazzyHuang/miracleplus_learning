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

/**
 * 审核讲师申请（通过/拒绝）
 */
export async function reviewInstructorApplication(
  applicationId: string,
  status: 'approved' | 'rejected'
): Promise<ActionResult> {
  try {
    const idResult = uuidSchema.safeParse(applicationId);
    if (!idResult.success) return fail('无效的资源 ID');

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // Fetch application to get user_id and topic for audit/points
    const { data: app, error: fetchError } = await supabase
      .from(DB.instructor_applications)
      .select('user_id, topic, status')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) {
      return fail('申请不存在或已被删除');
    }

    if (app.status !== 'pending') {
      return fail('该申请已被处理');
    }

    const { error } = await supabase
      .from(DB.instructor_applications)
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure('UPDATE', 'instructor_application', error.message, applicationId);
      logger.error('reviewInstructorApplication failed:', error);
      return fail('操作失败，请稍后重试');
    }

    // Award points on approval
    if (status === 'approved') {
      await awardAdminPointsAction(
        app.user_id,
        'WORKSHOP_INSTRUCTOR',
        400,
        applicationId,
        'instructor_application',
        `讲师申请通过: ${app.topic}`
      );
    }

    await auditService.logSuccess('UPDATE', 'instructor_application', applicationId, {
      after: { status, topic: app.topic, user_id: app.user_id },
    });
    logger.info('Admin action', { action: 'reviewInstructorApplication', adminId: user.id, applicationId, status });
    revalidateTag('instructors');
    return ok();
  } catch (error) {
    logger.error('reviewInstructorApplication error:', error);
    return fail(error instanceof Error ? error.message : '操作失败');
  }
}
