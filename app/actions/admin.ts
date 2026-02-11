'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { createAuditLogService } from '@/lib/admin/audit-service';
import { logger } from '@/lib/logger';
import {
  courseSchema,
  chapterSchema,
  lessonSchema,
  workshopSchema,
  type CourseFormData,
  type ChapterFormData,
  type LessonFormData,
  type WorkshopFormData,
} from '@/lib/validations';
import { DB } from '@/lib/db-tables';

/**
 * 通用操作结果类型
 */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

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

// ==================== 课程操作 ====================

/**
 * 创建课程
 */
export async function createCourse(data: CourseFormData): Promise<ActionResult<{ id: string }>> {
  const auditServiceInput = { actionType: 'CREATE' as const, resourceType: 'course' as const };

  try {
    const { supabase, user, auditService } = await requireAdmin();

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
    const { supabase, auditService } = await requireAdmin();

    // 校验部分数据
    const validation = courseSchema.partial().safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const validData = validation.data;
    const { error } = await supabase
      .from(DB.courses)
      .update({
        ...(validData.title !== undefined && { title: validData.title }),
        ...(validData.description !== undefined && { description: validData.description || null }),
        ...(validData.cover_image !== undefined && { cover_image: validData.cover_image || null }),
        ...(validData.is_published !== undefined && { is_published: validData.is_published }),
      })
      .eq('id', courseId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, courseId);
      logger.error('updateCourse failed:', error);
      return { success: false, error: '更新课程失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, courseId, {
      after: validData,
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
    const { supabase, user, auditService } = await requireAdmin();

    // 先获取课程信息用于审计
    const { data: course } = await supabase
      .from(DB.courses)
      .select('title')
      .eq('id', courseId)
      .single();

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
      before: { title: course?.title },
    });
    logger.info('Admin action', { action: 'deleteCourse', adminId: user.id, resourceId: courseId });
    revalidateTag('courses');
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
  try {
    const { supabase, user } = await requireAdmin();

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
      logger.error('createChapter failed:', error);
      return { success: false, error: '创建章节失败，请稍后重试' };
    }

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
  try {
    const { supabase, user } = await requireAdmin();

    // Input validation
    const parsed = chapterSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

    const { error } = await supabase
      .from(DB.chapters)
      .update({
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.order_index !== undefined && { order_index: parsed.data.order_index }),
      })
      .eq('id', chapterId);

    if (error) {
      logger.error('updateChapter failed:', error);
      return { success: false, error: '更新章节失败，请稍后重试' };
    }

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
    const { supabase, auditService } = await requireAdmin();

    const { error } = await supabase
      .from(DB.chapters)
      .delete()
      .eq('id', chapterId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, chapterId);
      logger.error('deleteChapter failed:', error);
      return { success: false, error: '删除章节失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, chapterId);
    logger.info('Admin action', { action: 'deleteChapter', resourceId: chapterId });
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
  try {
    const { supabase, user } = await requireAdmin();

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
      return { success: false, error: '创建课时失败，请稍后重试' };
    }

    logger.info('Admin action', { action: 'createLesson', adminId: user.id, resourceId: lesson.id });
    revalidateTag('courses');
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
  try {
    const { supabase, user } = await requireAdmin();

    // Input validation
    const parsed = lessonSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

    const { error } = await supabase
      .from(DB.lessons)
      .update({
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.content !== undefined && { content: parsed.data.content || '' }),
        ...(parsed.data.feishu_url !== undefined && { feishu_url: parsed.data.feishu_url || null }),
        ...(parsed.data.order_index !== undefined && { order_index: parsed.data.order_index }),
      })
      .eq('id', lessonId);

    if (error) {
      logger.error('updateLesson failed:', error);
      return { success: false, error: '更新课时失败，请稍后重试' };
    }

    logger.info('Admin action', { action: 'updateLesson', adminId: user.id, resourceId: lessonId });
    revalidateTag('courses');
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
    const { supabase, auditService } = await requireAdmin();

    const { error } = await supabase
      .from(DB.lessons)
      .delete()
      .eq('id', lessonId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, lessonId);
      logger.error('deleteLesson failed:', error);
      return { success: false, error: '删除课时失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, lessonId);
    logger.info('Admin action', { action: 'deleteLesson', resourceId: lessonId });
    revalidateTag('courses');
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
  try {
    const { supabase, user } = await requireAdmin();

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
      logger.error('createWorkshop failed:', error);
      return { success: false, error: '创建活动失败，请稍后重试' };
    }

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
  try {
    const { supabase, user } = await requireAdmin();

    // Input validation
    const parsed = workshopSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

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
      .eq('id', workshopId);

    if (error) {
      logger.error('updateWorkshop failed:', error);
      return { success: false, error: '更新活动失败，请稍后重试' };
    }

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
    const { supabase, auditService } = await requireAdmin();

    const { error } = await supabase
      .from(DB.workshops)
      .delete()
      .eq('id', workshopId);

    if (error) {
      await auditService.logFailure(auditServiceInput.actionType, auditServiceInput.resourceType, error.message, workshopId);
      logger.error('deleteWorkshop failed:', error);
      return { success: false, error: '删除活动失败，请稍后重试' };
    }

    await auditService.logSuccess(auditServiceInput.actionType, auditServiceInput.resourceType, workshopId);
    logger.info('Admin action', { action: 'deleteWorkshop', resourceId: workshopId });
    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    logger.error('deleteWorkshop error:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

/**
 * 切换 Workshop 发布状态
 */
export async function toggleWorkshopActive(workshopId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();

    // 获取当前状态
    const { data: workshop } = await supabase
      .from(DB.workshops)
      .select('is_active')
      .eq('id', workshopId)
      .single();

    if (!workshop) {
      return { success: false, error: '活动不存在' };
    }

    // 切换状态
    const { error } = await supabase
      .from(DB.workshops)
      .update({ is_active: !workshop.is_active })
      .eq('id', workshopId);

    if (error) {
      logger.error('toggleWorkshopActive failed:', error);
      return { success: false, error: '操作失败，请稍后重试' };
    }

    logger.info('Admin action', { action: 'toggleWorkshopActive', adminId: user.id, resourceId: workshopId });
    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    logger.error('toggleWorkshopActive error:', error);
    return { success: false, error: error instanceof Error ? error.message : '操作失败' };
  }
}
