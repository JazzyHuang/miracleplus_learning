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

// ==================== 文章操作 ====================

/**
 * 创建文章
 */
export async function createArticle(data: {
  title: string;
  content: string;
  type: 'daily' | 'monthly';
  author_id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit<{ id: string }>(user.id);
    if (rateLimitResult) return rateLimitResult;

    const { data: article, error } = await supabase
      .from(DB.articles)
      .insert({
        title: data.title,
        content: data.content,
        type: data.type,
        author_id: data.author_id,
      })
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure('CREATE', 'article', error.message);
      logger.error('createArticle failed:', error);
      return { success: false, error: '创建文章失败，请稍后重试' };
    }

    await auditService.logSuccess('CREATE', 'article', article.id, {
      afterData: { title: data.title, type: data.type, author_id: data.author_id },
      description: `创建了文章「${data.title}」`,
    });
    logger.info('Admin action', { action: 'createArticle', adminId: user.id, resourceId: article.id });
    revalidateTag('articles');
    return { success: true, data: { id: article.id } };
  } catch (error) {
    logger.error('createArticle error:', error);
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}

/**
 * 更新文章
 */
export async function updateArticle(
  id: string,
  data: { title?: string; content?: string; type?: 'daily' | 'monthly' }
): Promise<ActionResult> {
  try {
    const idError = validateId(id);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 获取更新前的数据
    const { data: before } = await supabase
      .from(DB.articles)
      .select('title, content, type')
      .eq('id', id)
      .single();

    if (!before) {
      return { success: false, error: '文章不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.articles)
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.type !== undefined && { type: data.type }),
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure('UPDATE', 'article', error.message, id);
      logger.error('updateArticle failed:', error);
      return { success: false, error: '更新文章失败，请稍后重试' };
    }

    const after = { ...before, ...data };
    await auditService.logSuccess('UPDATE', 'article', id, {
      beforeData: before,
      afterData: after,
      description: '更新了文章标题和内容',
    });
    logger.info('Admin action', { action: 'updateArticle', adminId: user.id, resourceId: id });
    revalidateTag('articles');
    return { success: true };
  } catch (error) {
    logger.error('updateArticle error:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除文章
 */
export async function deleteArticle(id: string): Promise<ActionResult> {
  try {
    const idError = validateId(id);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 获取删除前的数据
    const { data: before } = await supabase
      .from(DB.articles)
      .select('title, content, type, is_published')
      .eq('id', id)
      .single();

    if (!before) {
      return { success: false, error: '文章不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.articles)
      .delete()
      .eq('id', id);

    if (error) {
      await auditService.logFailure('DELETE', 'article', error.message, id);
      logger.error('deleteArticle failed:', error);
      return { success: false, error: '删除文章失败，请稍后重试' };
    }

    await auditService.logSuccess('DELETE', 'article', id, {
      beforeData: before,
      description: '删除了文章',
    });
    logger.info('Admin action', { action: 'deleteArticle', adminId: user.id, resourceId: id });
    revalidateTag('articles');
    return { success: true };
  } catch (error) {
    logger.error('deleteArticle error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

/**
 * 切换文章发布状态
 */
export async function toggleArticlePublish(id: string, isPublished: boolean): Promise<ActionResult> {
  try {
    const idError = validateId(id);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 获取更新前的数据
    const { data: before } = await supabase
      .from(DB.articles)
      .select('title, is_published, published_at')
      .eq('id', id)
      .single();

    if (!before) {
      return { success: false, error: '文章不存在或已被删除' };
    }

    const newIsPublished = !isPublished;
    const publishedAt = newIsPublished ? new Date().toISOString() : null;

    const { error } = await supabase
      .from(DB.articles)
      .update({ is_published: newIsPublished, published_at: publishedAt })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure(isPublished ? 'UNPUBLISH' : 'PUBLISH', 'article', error.message, id);
      logger.error('toggleArticlePublish failed:', error);
      return { success: false, error: '操作失败，请稍后重试' };
    }

    const actionType = isPublished ? 'UNPUBLISH' : 'PUBLISH';
    await auditService.logSuccess(actionType, 'article', id, {
      beforeData: before,
      afterData: { ...before, is_published: newIsPublished, published_at: publishedAt },
      description: isPublished ? '取消发布了文章' : '发布了文章',
    });
    logger.info('Admin action', { action: 'toggleArticlePublish', adminId: user.id, resourceId: id, newIsPublished });
    revalidateTag('articles');
    return { success: true };
  } catch (error) {
    logger.error('toggleArticlePublish error:', error);
    return { success: false, error: error instanceof Error ? error.message : '操作失败' };
  }
}
