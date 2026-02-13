'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { createAuditLogService } from '@/lib/admin/audit-service';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { aiToolSchema, uuidSchema, type AIToolFormData } from '@/lib/validations';
import { DB } from '@/lib/db-tables';
import { type ActionResult, ok, fail, rateLimited } from '@/lib/action-result';

async function requireAdmin() {
  const supabase = await createClient();
  const { isAdmin, user } = await checkAdminAccess(supabase);
  if (!user) throw new Error('未登录');
  if (!isAdmin) throw new Error('无权限执行此操作');
  const auditService = await createAuditLogService(user.id);
  return { supabase, user, auditService };
}

async function checkAdminRateLimit<T = void>(userId: string): Promise<ActionResult<T> | null> {
  const result = await checkRateLimit(`admin-action:${userId}`, RATE_LIMITS.adminAction);
  if (!result.success) return rateLimited<T>(result.retryAfter ?? 60);
  return null;
}

// ==================== AI 工具 CRUD ====================

export async function createAITool(data: AIToolFormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user, auditService } = await requireAdmin();
    const rl = await checkAdminRateLimit<{ id: string }>(user.id);
    if (rl) return rl;

    const validation = aiToolSchema.safeParse(data);
    if (!validation.success) {
      return fail(validation.error.issues[0]?.message ?? '验证失败');
    }

    const v = validation.data;
    const { data: tool, error } = await supabase
      .from(DB.ai_tools)
      .insert({
        name: v.name,
        slug: v.slug,
        category_id: v.category_id || null,
        description: v.description || null,
        long_description: v.long_description || null,
        website_url: v.website_url || null,
        logo_url: v.logo_url || null,
        preview_image_url: v.preview_image_url || null,
        pricing_type: v.pricing_type,
        pricing_details: v.pricing_details || null,
        pros: v.pros || null,
        cons: v.cons || null,
        tags: v.tags || null,
        is_featured: v.is_featured ?? false,
        is_active: v.is_active ?? true,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return fail('slug 已存在，请使用其他值');
      await auditService.logFailure('CREATE', 'ai_tool', error.message);
      logger.error('createAITool failed:', error);
      return fail('创建失败，请稍后重试');
    }

    await auditService.logSuccess('CREATE', 'ai_tool', tool.id, {
      afterData: { name: v.name, slug: v.slug },
      description: `创建了AI工具「${v.name}」`,
    });
    revalidateTag('ai-tools', 'max');
    return ok({ id: tool.id });
  } catch (error) {
    logger.error('createAITool error:', error);
    return fail(error instanceof Error ? error.message : '创建失败');
  }
}

export async function updateAITool(
  toolId: string,
  data: Partial<AIToolFormData>
): Promise<ActionResult> {
  try {
    const idCheck = uuidSchema.safeParse(toolId);
    if (!idCheck.success) return fail('无效的资源 ID');

    const { supabase, user, auditService } = await requireAdmin();
    const rl = await checkAdminRateLimit(user.id);
    if (rl) return rl;

    const validation = aiToolSchema.partial().safeParse(data);
    if (!validation.success) {
      return fail(validation.error.issues[0]?.message ?? '验证失败');
    }

    const v = validation.data;
    const updateData: Record<string, unknown> = {};

    const { data: before } = await supabase
      .from(DB.ai_tools)
      .select('name, slug, category_id, description, pricing_type, is_featured, is_active')
      .eq('id', toolId)
      .single();

    if (v.name !== undefined) updateData.name = v.name;
    if (v.slug !== undefined) updateData.slug = v.slug;
    if (v.category_id !== undefined) updateData.category_id = v.category_id || null;
    if (v.description !== undefined) updateData.description = v.description || null;
    if (v.long_description !== undefined) updateData.long_description = v.long_description || null;
    if (v.website_url !== undefined) updateData.website_url = v.website_url || null;
    if (v.logo_url !== undefined) updateData.logo_url = v.logo_url || null;
    if (v.preview_image_url !== undefined) updateData.preview_image_url = v.preview_image_url || null;
    if (v.pricing_type !== undefined) updateData.pricing_type = v.pricing_type;
    if (v.pricing_details !== undefined) updateData.pricing_details = v.pricing_details || null;
    if (v.pros !== undefined) updateData.pros = v.pros || null;
    if (v.cons !== undefined) updateData.cons = v.cons || null;
    if (v.tags !== undefined) updateData.tags = v.tags || null;
    if (v.is_featured !== undefined) updateData.is_featured = v.is_featured;
    if (v.is_active !== undefined) updateData.is_active = v.is_active;

    const { error } = await supabase
      .from(DB.ai_tools)
      .update(updateData)
      .eq('id', toolId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return fail('工具不存在或已被删除');
      if (error.code === '23505') return fail('slug 已存在，请使用其他值');
      await auditService.logFailure('UPDATE', 'ai_tool', error.message, toolId);
      logger.error('updateAITool failed:', error);
      return fail('更新失败，请稍后重试');
    }

    await auditService.logSuccess('UPDATE', 'ai_tool', toolId, {
      beforeData: before,
      afterData: v as Record<string, unknown>,
      description: '更新了AI工具信息',
    });
    revalidateTag('ai-tools', 'max');
    return ok();
  } catch (error) {
    logger.error('updateAITool error:', error);
    return fail(error instanceof Error ? error.message : '更新失败');
  }
}

export async function deleteAITool(toolId: string): Promise<ActionResult> {
  try {
    const idCheck = uuidSchema.safeParse(toolId);
    if (!idCheck.success) return fail('无效的资源 ID');

    const { supabase, user, auditService } = await requireAdmin();
    const rl = await checkAdminRateLimit(user.id);
    if (rl) return rl;

    const { data: tool } = await supabase
      .from(DB.ai_tools)
      .select('name')
      .eq('id', toolId)
      .single();

    if (!tool) return fail('工具不存在或已被删除');

    const { error } = await supabase
      .from(DB.ai_tools)
      .delete()
      .eq('id', toolId);

    if (error) {
      await auditService.logFailure('DELETE', 'ai_tool', error.message, toolId);
      logger.error('deleteAITool failed:', error);
      return fail('删除失败，请稍后重试');
    }

    await auditService.logSuccess('DELETE', 'ai_tool', toolId, {
      beforeData: { name: tool.name },
      description: `删除了AI工具「${tool.name}」`,
    });
    revalidateTag('ai-tools', 'max');
    return ok();
  } catch (error) {
    logger.error('deleteAITool error:', error);
    return fail(error instanceof Error ? error.message : '删除失败');
  }
}

export async function setAIToolFeatured(toolId: string, featured: boolean): Promise<ActionResult> {
  try {
    const idCheck = uuidSchema.safeParse(toolId);
    if (!idCheck.success) return fail('无效的资源 ID');

    const { supabase, user, auditService } = await requireAdmin();
    const rl = await checkAdminRateLimit(user.id);
    if (rl) return rl;

    const { error } = await supabase
      .from(DB.ai_tools)
      .update({ is_featured: featured })
      .eq('id', toolId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return fail('工具不存在');
      await auditService.logFailure('UPDATE', 'ai_tool', error.message, toolId);
      return fail('操作失败');
    }

    await auditService.logSuccess('UPDATE', 'ai_tool', toolId, {
      beforeData: { is_featured: !featured },
      afterData: { is_featured: featured },
      description: featured ? '设为精选' : '取消精选',
    });
    revalidateTag('ai-tools', 'max');
    return ok();
  } catch (error) {
    logger.error('setAIToolFeatured error:', error);
    return fail(error instanceof Error ? error.message : '操作失败');
  }
}

export async function setAIToolActive(toolId: string, active: boolean): Promise<ActionResult> {
  try {
    const idCheck = uuidSchema.safeParse(toolId);
    if (!idCheck.success) return fail('无效的资源 ID');

    const { supabase, user, auditService } = await requireAdmin();
    const rl = await checkAdminRateLimit(user.id);
    if (rl) return rl;

    const { error } = await supabase
      .from(DB.ai_tools)
      .update({ is_active: active })
      .eq('id', toolId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return fail('工具不存在');
      await auditService.logFailure('UPDATE', 'ai_tool', error.message, toolId);
      return fail('操作失败');
    }

    await auditService.logSuccess('UPDATE', 'ai_tool', toolId, {
      beforeData: { is_active: !active },
      afterData: { is_active: active },
      description: active ? '上架了AI工具' : '下架了AI工具',
    });
    revalidateTag('ai-tools', 'max');
    return ok();
  } catch (error) {
    logger.error('setAIToolActive error:', error);
    return fail(error instanceof Error ? error.message : '操作失败');
  }
}

// ==================== 缓存失效 ====================

/**
 * 刷新 AI 工具缓存（用于客户端评分/灵感碎片提交后）
 */
export async function revalidateAIToolsCache(): Promise<void> {
  revalidateTag('ai-tools', 'max');
}
