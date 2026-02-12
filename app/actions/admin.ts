'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { createAuditLogService } from '@/lib/admin/audit-service';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  courseSchema,
  chapterSchema,
  lessonSchema,
  workshopSchema,
  uuidSchema,
  type CourseFormData,
  type ChapterFormData,
  type LessonFormData,
  type WorkshopFormData,
} from '@/lib/validations';
import { DB } from '@/lib/db-tables';
import { type ActionResult, rateLimited } from '@/lib/action-result';

export type { ActionResult };

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

// ==================== 课程操作 ====================

/**
 * 创建课程
 */
export async function createCourse(data: CourseFormData): Promise<ActionResult<{ id: string }>> {
  const auditServiceInput = { actionType: 'CREATE' as const, resourceType: 'course' as const };

  try {
    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit<{ id: string }>(user.id);
    if (rateLimitResult) return rateLimitResult;

    const validation = courseSchema.safeParse(data);
    if (!validation.success) {
      const errorMessage = validation.error.issues[0]?.message ?? '未知验证错误';
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, errorMessage);
      return { success: false, error: errorMessage };
    }

    // 获取最大 order_index（maybeSingle 避免空表时抛错）
    const { data: maxOrder } = await supabase
      .from(DB.courses)
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: course, error } = await supabase
      .from(DB.courses)
      .insert({
        title: validation.data.title,
        description: validation.data.description || null,
        cover_image: validation.data.cover_image || null,
        is_published: validation.data.is_published,
        order_index: (maxOrder?.order_index ?? -1) + 1,
      })
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message);
      logger.error('createCourse failed:', error);
      return { success: false, error: '创建课程失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, course.id, {
      after: { title: validation.data.title, is_published: validation.data.is_published },
    });
    logger.info('Admin action', { action: 'createCourse', adminId: user.id, resourceId: course.id });
    revalidateTag('courses');
    return { success: true, data: { id: course.id } };
  } catch (error) {
    logger.error('createCourse error:', error);
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}

/**
 * 更新课程
 */
export async function updateCourse(
  courseId: string,
  data: Partial<CourseFormData>
): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'UPDATE' as const, resourceType: 'course' as const };

  try {
    const idError = validateId(courseId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 校验部分数据
    const validation = courseSchema.partial().safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const validData = validation.data;

    const { data: before } = await supabase
      .from(DB.courses)
      .select('title, description, cover_image, is_published')
      .eq('id', courseId)
      .single();

    const { error } = await supabase
      .from(DB.courses)
      .update({
        ...(validData.title !== undefined && { title: validData.title }),
        ...(validData.description !== undefined && { description: validData.description || null }),
        ...(validData.cover_image !== undefined && { cover_image: validData.cover_image || null }),
        ...(validData.is_published !== undefined && { is_published: validData.is_published }),
      })
      .eq('id', courseId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '课程不存在或已被删除' };
      }
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, courseId);
      logger.error('updateCourse failed:', error);
      return { success: false, error: '更新课程失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, courseId, {
      beforeData: before,
      afterData: validData as Record<string, unknown>,
      description: '更新了课程信息',
    });
    logger.info('Admin action', { action: 'updateCourse', resourceId: courseId });
    revalidateTag('courses');
    return { success: true };
  } catch (error) {
    logger.error('updateCourse error:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除课程
 */
export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'DELETE' as const, resourceType: 'course' as const };

  try {
    const idError = validateId(courseId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 先获取课程信息用于审计
    const { data: course } = await supabase
      .from(DB.courses)
      .select('title')
      .eq('id', courseId)
      .single();

    if (!course) {
      return { success: false, error: '课程不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.courses)
      .delete()
      .eq('id', courseId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, courseId);
      logger.error('deleteCourse failed:', error);
      return { success: false, error: '删除课程失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, courseId, {
      beforeData: { title: course.title },
      description: `删除了课程「${course.title}」`,
    });
    logger.info('Admin action', { action: 'deleteCourse', adminId: user.id, resourceId: courseId });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true };
  } catch (error) {
    logger.error('deleteCourse error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

// ==================== 章节操作 ====================

/**
 * 创建章节
 */
export async function createChapter(
  courseId: string,
  data: ChapterFormData
): Promise<ActionResult<{ id: string }>> {
  const auditServiceInput = { actionType: 'CREATE' as const, resourceType: 'chapter' as const };

  try {
    const idError = validateId<{ id: string }>(courseId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit<{ id: string }>(user.id);
    if (rateLimitResult) return rateLimitResult;

    const validation = chapterSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    // 获取最大 order_index（maybeSingle 避免空表时抛错）
    const { data: maxOrder } = await supabase
      .from(DB.chapters)
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: chapter, error } = await supabase
      .from(DB.chapters)
      .insert({
        course_id: courseId,
        title: validation.data.title,
        order_index: validation.data.order_index ?? (maxOrder?.order_index ?? -1) + 1,
      })
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message);
      logger.error('createChapter failed:', error);
      return { success: false, error: '创建章节失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, chapter.id, {
      after: { title: validation.data.title, course_id: courseId },
    });
    logger.info('Admin action', { action: 'createChapter', adminId: user.id, resourceId: chapter.id });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true, data: { id: chapter.id } };
  } catch (error) {
    logger.error('createChapter error:', error);
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}

/**
 * 更新章节
 */
export async function updateChapter(
  chapterId: string,
  data: Partial<ChapterFormData>
): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'UPDATE' as const, resourceType: 'chapter' as const };

  try {
    const idError = validateId(chapterId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // Input validation
    const parsed = chapterSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

    const { data: before } = await supabase
      .from(DB.chapters)
      .select('title, order_index')
      .eq('id', chapterId)
      .single();

    const { error } = await supabase
      .from(DB.chapters)
      .update({
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.order_index !== undefined && { order_index: parsed.data.order_index }),
      })
      .eq('id', chapterId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '章节不存在或已被删除' };
      }
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, chapterId);
      logger.error('updateChapter failed:', error);
      return { success: false, error: '更新章节失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, chapterId, {
      beforeData: before,
      afterData: parsed.data as Record<string, unknown>,
      description: '更新了章节信息',
    });
    logger.info('Admin action', { action: 'updateChapter', adminId: user.id, resourceId: chapterId });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true };
  } catch (error) {
    logger.error('updateChapter error:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除章节
 */
export async function deleteChapter(chapterId: string): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'DELETE' as const, resourceType: 'chapter' as const };

  try {
    const idError = validateId(chapterId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 先确认资源存在
    const { data: chapter } = await supabase
      .from(DB.chapters)
      .select('title')
      .eq('id', chapterId)
      .single();

    if (!chapter) {
      return { success: false, error: '章节不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.chapters)
      .delete()
      .eq('id', chapterId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, chapterId);
      logger.error('deleteChapter failed:', error);
      return { success: false, error: '删除章节失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, chapterId, {
      beforeData: { title: chapter.title },
      description: `删除了章节「${chapter.title}」`,
    });
    logger.info('Admin action', { action: 'deleteChapter', adminId: user.id, resourceId: chapterId });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true };
  } catch (error) {
    logger.error('deleteChapter error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

// ==================== 课时操作 ====================

/**
 * 创建课时
 */
export async function createLesson(
  chapterId: string,
  data: LessonFormData
): Promise<ActionResult<{ id: string }>> {
  const auditServiceInput = { actionType: 'CREATE' as const, resourceType: 'lesson' as const };

  try {
    const idError = validateId<{ id: string }>(chapterId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit<{ id: string }>(user.id);
    if (rateLimitResult) return rateLimitResult;

    const validation = lessonSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    // 获取最大 order_index（maybeSingle 避免空表时抛错）
    const { data: maxOrder } = await supabase
      .from(DB.lessons)
      .select('order_index')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lesson, error } = await supabase
      .from(DB.lessons)
      .insert({
        chapter_id: chapterId,
        title: validation.data.title,
        content: validation.data.content || '',
        feishu_url: validation.data.feishu_url || null,
        order_index: validation.data.order_index ?? (maxOrder?.order_index ?? -1) + 1,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('createLesson failed:', error);
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message);
      return { success: false, error: '创建课时失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, lesson.id, {
      afterData: { title: validation.data.title, chapter_id: chapterId },
      description: `创建了课时「${validation.data.title}」`,
    });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true, data: { id: lesson.id } };
  } catch (error) {
    logger.error('createLesson error:', error);
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}

/**
 * 更新课时
 */
export async function updateLesson(
  lessonId: string,
  data: Partial<LessonFormData>
): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'UPDATE' as const, resourceType: 'lesson' as const };

  try {
    const idError = validateId(lessonId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // Input validation
    const parsed = lessonSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

    // 获取操作前状态
    const { data: before } = await supabase
      .from(DB.lessons)
      .select('title, content, feishu_url, order_index')
      .eq('id', lessonId)
      .single();

    const { error } = await supabase
      .from(DB.lessons)
      .update({
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.content !== undefined && { content: parsed.data.content || '' }),
        ...(parsed.data.feishu_url !== undefined && { feishu_url: parsed.data.feishu_url || null }),
        ...(parsed.data.order_index !== undefined && { order_index: parsed.data.order_index }),
      })
      .eq('id', lessonId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '课时不存在或已被删除' };
      }
      logger.error('updateLesson failed:', error);
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, lessonId);
      return { success: false, error: '更新课时失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, lessonId, {
      beforeData: before,
      afterData: parsed.data,
      description: '更新了课时内容',
    });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true };
  } catch (error) {
    logger.error('updateLesson error:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除课时
 */
export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'DELETE' as const, resourceType: 'lesson' as const };

  try {
    const idError = validateId(lessonId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 先确认资源存在
    const { data: lesson } = await supabase
      .from(DB.lessons)
      .select('title')
      .eq('id', lessonId)
      .single();

    if (!lesson) {
      return { success: false, error: '课时不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.lessons)
      .delete()
      .eq('id', lessonId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, lessonId);
      logger.error('deleteLesson failed:', error);
      return { success: false, error: '删除课时失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, lessonId, {
      beforeData: { title: lesson.title },
      description: `删除了课时「${lesson.title}」`,
    });
    logger.info('Admin action', { action: 'deleteLesson', adminId: user.id, resourceId: lessonId });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true };
  } catch (error) {
    logger.error('deleteLesson error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

// ==================== Workshop 操作 ====================

/**
 * 创建 Workshop
 */
export async function createWorkshop(data: WorkshopFormData): Promise<ActionResult<{ id: string }>> {
  const auditServiceInput = { actionType: 'CREATE' as const, resourceType: 'workshop' as const };

  try {
    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit<{ id: string }>(user.id);
    if (rateLimitResult) return rateLimitResult;

    const validation = workshopSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const { data: workshop, error } = await supabase
      .from(DB.workshops)
      .insert({
        title: validation.data.title,
        description: validation.data.description || null,
        cover_image: validation.data.cover_image || null,
        event_date: validation.data.start_date,
        feishu_url: validation.data.feishu_url || null,
        is_active: validation.data.is_published,
      })
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message);
      logger.error('createWorkshop failed:', error);
      return { success: false, error: '创建活动失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, workshop.id, {
      after: { title: validation.data.title, is_published: validation.data.is_published },
    });
    logger.info('Admin action', { action: 'createWorkshop', adminId: user.id, resourceId: workshop.id });
    revalidateTag('workshops');
    return { success: true, data: { id: workshop.id } };
  } catch (error) {
    logger.error('createWorkshop error:', error);
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}

/**
 * 更新 Workshop
 */
export async function updateWorkshop(
  workshopId: string,
  data: Partial<WorkshopFormData>
): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'UPDATE' as const, resourceType: 'workshop' as const };

  try {
    const idError = validateId(workshopId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // Input validation
    const parsed = workshopSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

    const { data: before } = await supabase
      .from(DB.workshops)
      .select('title, description, cover_image, event_date, feishu_url, is_active')
      .eq('id', workshopId)
      .single();

    const { error } = await supabase
      .from(DB.workshops)
      .update({
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
        ...(parsed.data.cover_image !== undefined && { cover_image: parsed.data.cover_image || null }),
        ...(parsed.data.start_date !== undefined && { event_date: parsed.data.start_date }),
        ...(parsed.data.feishu_url !== undefined && { feishu_url: parsed.data.feishu_url || null }),
        ...(parsed.data.is_published !== undefined && { is_active: parsed.data.is_published }),
      })
      .eq('id', workshopId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '活动不存在或已被删除' };
      }
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, workshopId);
      logger.error('updateWorkshop failed:', error);
      return { success: false, error: '更新活动失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, workshopId, {
      beforeData: before,
      afterData: parsed.data as Record<string, unknown>,
      description: '更新了活动信息',
    });
    logger.info('Admin action', { action: 'updateWorkshop', adminId: user.id, resourceId: workshopId });
    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    logger.error('updateWorkshop error:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除 Workshop
 */
export async function deleteWorkshop(workshopId: string): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'DELETE' as const, resourceType: 'workshop' as const };

  try {
    const idError = validateId(workshopId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 先确认资源存在
    const { data: workshop } = await supabase
      .from(DB.workshops)
      .select('title')
      .eq('id', workshopId)
      .single();

    if (!workshop) {
      return { success: false, error: '活动不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.workshops)
      .delete()
      .eq('id', workshopId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, workshopId);
      logger.error('deleteWorkshop failed:', error);
      return { success: false, error: '删除活动失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, workshopId, {
      beforeData: { title: workshop.title },
      description: `删除了活动「${workshop.title}」`,
    });
    logger.info('Admin action', { action: 'deleteWorkshop', adminId: user.id, resourceId: workshopId });
    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    logger.error('deleteWorkshop error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

/**
 * 设置 Workshop 发布状态
 * 使用显式目标状态替代 toggle，消除 TOCTOU 竞态条件
 */
export async function setWorkshopActive(workshopId: string, isActive: boolean): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'UPDATE' as const, resourceType: 'workshop' as const };

  try {
    const idError = validateId(workshopId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    const { error } = await supabase
      .from(DB.workshops)
      .update({ is_active: isActive })
      .eq('id', workshopId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '活动不存在或已被删除' };
      }
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, workshopId);
      logger.error('setWorkshopActive failed:', error);
      return { success: false, error: '操作失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, workshopId, {
      beforeData: { is_active: !isActive },
      afterData: { is_active: isActive },
      description: isActive ? '上架了活动' : '下架了活动',
    });
    logger.info('Admin action', { action: 'setWorkshopActive', adminId: user.id, resourceId: workshopId, isActive });
    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    logger.error('setWorkshopActive error:', error);
    return { success: false, error: error instanceof Error ? error.message : '操作失败' };
  }
}

/**
 * @deprecated 使用 setWorkshopActive(workshopId, isActive) 替代，避免 TOCTOU 竞态
 */
export async function toggleWorkshopActive(workshopId: string): Promise<ActionResult> {
  try {
    const idError = validateId(workshopId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 获取当前状态
    const { data: workshop } = await supabase
      .from(DB.workshops)
      .select('is_active')
      .eq('id', workshopId)
      .single();

    if (!workshop) {
      return { success: false, error: '活动不存在' };
    }

    const newState = !workshop.is_active;

    // 切换状态
    const { error } = await supabase
      .from(DB.workshops)
      .update({ is_active: newState })
      .eq('id', workshopId);

    if (error) {
      await auditService.logFailure('UPDATE', 'workshop', error.message, workshopId);
      logger.error('toggleWorkshopActive failed:', error);
      return { success: false, error: '操作失败，请稍后重试' };
    }

    await auditService.logSuccess('UPDATE', 'workshop', workshopId, {
      after: { is_active: newState },
    });
    logger.info('Admin action', { action: 'toggleWorkshopActive', adminId: user.id, resourceId: workshopId });
    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    logger.error('toggleWorkshopActive error:', error);
    return { success: false, error: error instanceof Error ? error.message : '操作失败' };
  }
}

// ==================== 题目操作 ====================

/**
 * 创建题目
 */
export async function createQuestion(
  lessonId: string,
  data: { type: string; question_text: string; options: unknown[]; correct_answer: unknown; explanation?: string; order_index?: number }
): Promise<ActionResult<{ id: string }>> {
  const auditServiceInput = { actionType: 'CREATE' as const, resourceType: 'question' as const };

  try {
    const idError = validateId<{ id: string }>(lessonId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit<{ id: string }>(user.id);
    if (rateLimitResult) return rateLimitResult;

    const { data: question, error } = await supabase
      .from(DB.questions)
      .insert({
        lesson_id: lessonId,
        type: data.type,
        question_text: data.question_text,
        options: data.options,
        correct_answer: data.correct_answer,
        explanation: data.explanation || null,
        order_index: data.order_index ?? 0,
      })
      .select('id')
      .single();

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message);
      logger.error('createQuestion failed:', error);
      return { success: false, error: '创建题目失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, question.id, {
      afterData: { lesson_id: lessonId, type: data.type, question_text: data.question_text },
      description: `添加了题目「${data.question_text.slice(0, 30)}」`,
    });
    logger.info('Admin action', { action: 'createQuestion', adminId: user.id, resourceId: question.id });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true, data: { id: question.id } };
  } catch (error) {
    logger.error('createQuestion error:', error);
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}

/**
 * 更新题目
 */
export async function updateQuestion(
  questionId: string,
  data: { type?: string; question_text?: string; options?: unknown[]; correct_answer?: unknown; explanation?: string; order_index?: number }
): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'UPDATE' as const, resourceType: 'question' as const };

  try {
    const idError = validateId(questionId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 获取操作前状态
    const { data: before } = await supabase
      .from(DB.questions)
      .select('type, question_text, options, correct_answer, explanation, order_index')
      .eq('id', questionId)
      .single();

    if (!before) {
      return { success: false, error: '题目不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.questions)
      .update({
        ...(data.type !== undefined && { type: data.type }),
        ...(data.question_text !== undefined && { question_text: data.question_text }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.correct_answer !== undefined && { correct_answer: data.correct_answer }),
        ...(data.explanation !== undefined && { explanation: data.explanation || null }),
        ...(data.order_index !== undefined && { order_index: data.order_index }),
      })
      .eq('id', questionId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '题目不存在或已被删除' };
      }
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, questionId);
      logger.error('updateQuestion failed:', error);
      return { success: false, error: '更新题目失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, questionId, {
      beforeData: before,
      afterData: data,
      description: '更新了题目内容',
    });
    logger.info('Admin action', { action: 'updateQuestion', adminId: user.id, resourceId: questionId });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true };
  } catch (error) {
    logger.error('updateQuestion error:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除题目
 */
export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const auditServiceInput = { actionType: 'DELETE' as const, resourceType: 'question' as const };

  try {
    const idError = validateId(questionId);
    if (idError) return idError;

    const { supabase, user, auditService } = await requireAdmin();

    const rateLimitResult = await checkAdminRateLimit(user.id);
    if (rateLimitResult) return rateLimitResult;

    // 先确认资源存在
    const { data: question } = await supabase
      .from(DB.questions)
      .select('question_text')
      .eq('id', questionId)
      .single();

    if (!question) {
      return { success: false, error: '题目不存在或已被删除' };
    }

    const { error } = await supabase
      .from(DB.questions)
      .delete()
      .eq('id', questionId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, questionId);
      logger.error('deleteQuestion failed:', error);
      return { success: false, error: '删除题目失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, questionId, {
      beforeData: { question_text: question.question_text },
      description: `删除了题目「${question.question_text.slice(0, 30)}」`,
    });
    logger.info('Admin action', { action: 'deleteQuestion', adminId: user.id, resourceId: questionId });
    revalidateTag('courses');
    revalidateTag('lessons');
    return { success: true };
  } catch (error) {
    logger.error('deleteQuestion error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

// ==================== 用户角色管理 ====================

/**
 * 更新用户角色（提升为管理员 / 降级为普通用户）
 *
 * 安全说明：
 * 1. 需要 SUPABASE_SERVICE_ROLE_KEY 来修改 auth.users.app_metadata
 * 2. 同时更新 app_metadata.role 和 DB.users.role 保持一致
 * 3. 管理员不能降级自己
 * 4. auth 更新先于 DB 更新（auth 是权限真实来源）
 */
export async function updateUserRoleAction(
  targetUserId: string,
  newRole: 'admin' | 'user'
): Promise<ActionResult> {
  try {
    // 1. UUID 校验
    const idError = validateId(targetUserId);
    if (idError) return idError;

    // 2. 管理员鉴权
    const { supabase, user, auditService } = await requireAdmin();

    // 3. 限流检查
    const rlResult = await checkAdminRateLimit(user.id);
    if (rlResult) return rlResult;

    // 4. 自降级拦截
    if (user.id === targetUserId && newRole === 'user') {
      await auditService.logFailure('ROLE_CHANGE', 'user', '管理员不能降级自己', targetUserId);
      return { success: false, error: '不能降级自己的管理员权限' };
    }

    // 5. 角色值校验
    if (newRole !== 'admin' && newRole !== 'user') {
      return { success: false, error: '无效的角色值' };
    }

    // 6. Service Role Key 检查
    const serviceRoleKey = env.supabaseServiceRoleKey;
    if (!serviceRoleKey) {
      logger.error('角色变更失败：缺少 SUPABASE_SERVICE_ROLE_KEY');
      await auditService.logFailure('ROLE_CHANGE', 'user', '服务配置错误：缺少 SERVICE_ROLE_KEY', targetUserId);
      return { success: false, error: '服务配置错误，请联系系统管理员' };
    }

    // 7. 查询目标用户当前角色
    const { data: targetUser } = await supabase
      .from(DB.users)
      .select('name, email, role')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) {
      return { success: false, error: '用户不存在' };
    }

    // 8. 幂等检查
    if (targetUser.role === newRole) {
      return { success: false, error: `该用户已经是${newRole === 'admin' ? '管理员' : '普通用户'}` };
    }

    // 9. 使用 service role client 更新 app_metadata
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(env.supabaseUrl, serviceRoleKey);

    const { error: authError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { app_metadata: { role: newRole } }
    );

    if (authError) {
      logger.error('更新 auth app_metadata 失败:', authError);
      await auditService.logFailure('ROLE_CHANGE', 'user', authError.message, targetUserId);
      return { success: false, error: '角色变更失败，请稍后重试' };
    }

    // 10. 同步更新 DB role 列
    const { error: dbError } = await supabase
      .from(DB.users)
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (dbError) {
      // 11. 部分失败回滚：尝试恢复 auth 变更
      logger.error('更新数据库 role 失败，尝试回滚 auth:', dbError);
      await adminClient.auth.admin.updateUserById(
        targetUserId,
        { app_metadata: { role: targetUser.role } }
      );
      await auditService.logFailure('ROLE_CHANGE', 'user', `数据库更新失败（已回滚 auth）: ${dbError.message}`, targetUserId);
      return { success: false, error: '角色变更失败，请稍后重试' };
    }

    // 12. 审计日志
    const roleLabel = newRole === 'admin' ? '管理员' : '普通用户';
    await auditService.logSuccess('ROLE_CHANGE', 'user', targetUserId, {
      beforeData: { role: targetUser.role, name: targetUser.name, email: targetUser.email },
      afterData: { role: newRole },
      changedFields: ['role'],
      description: `将用户「${targetUser.name ?? targetUser.email}」的角色变更为${roleLabel}`,
    });

    logger.info('Admin action', {
      action: 'updateUserRole',
      adminId: user.id,
      targetUserId,
      oldRole: targetUser.role,
      newRole,
    });

    // 13. 缓存失效
    revalidateTag('user-stats');

    return { success: true };
  } catch (error) {
    logger.error('updateUserRoleAction error:', error);
    return { success: false, error: error instanceof Error ? error.message : '角色变更失败' };
  }
}
