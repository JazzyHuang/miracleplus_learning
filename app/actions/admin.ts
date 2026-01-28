'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
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

/**
 * 通用操作结果类型
 */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 检查管理员权限并返回 Supabase 客户端
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
  
  return { supabase, user };
}

// ==================== 课程操作 ====================

/**
 * 创建课程
 */
export async function createCourse(data: CourseFormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();
    
    const validation = courseSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message };
    }

    // 获取最大 order_index
    const { data: maxOrder } = await supabase
      .from('courses')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const { data: course, error } = await supabase
      .from('courses')
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
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true, data: { id: course.id } };
  } catch (error) {
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
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('courses')
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.cover_image !== undefined && { cover_image: data.cover_image || null }),
        ...(data.is_published !== undefined && { is_published: data.is_published }),
      })
      .eq('id', courseId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除课程
 */
export async function deleteCourse(courseId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true };
  } catch (error) {
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
    const { supabase } = await requireAdmin();
    
    const validation = chapterSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message };
    }

    // 获取最大 order_index
    const { data: maxOrder } = await supabase
      .from('chapters')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const { data: chapter, error } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId,
        title: validation.data.title,
        order_index: validation.data.order_index ?? (maxOrder?.order_index ?? -1) + 1,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true, data: { id: chapter.id } };
  } catch (error) {
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
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('chapters')
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.order_index !== undefined && { order_index: data.order_index }),
      })
      .eq('id', chapterId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除章节
 */
export async function deleteChapter(chapterId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true };
  } catch (error) {
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
    const { supabase } = await requireAdmin();
    
    const validation = lessonSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message };
    }

    // 获取最大 order_index
    const { data: maxOrder } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const { data: lesson, error } = await supabase
      .from('lessons')
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
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true, data: { id: lesson.id } };
  } catch (error) {
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
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('lessons')
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content || '' }),
        ...(data.feishu_url !== undefined && { feishu_url: data.feishu_url || null }),
        ...(data.order_index !== undefined && { order_index: data.order_index }),
      })
      .eq('id', lessonId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除课时
 */
export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('courses');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

// ==================== Workshop 操作 ====================

/**
 * 创建 Workshop
 */
export async function createWorkshop(data: WorkshopFormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();
    
    const validation = workshopSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message };
    }

    const { data: workshop, error } = await supabase
      .from('workshops')
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
      return { success: false, error: error.message };
    }

    revalidateTag('workshops');
    return { success: true, data: { id: workshop.id } };
  } catch (error) {
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
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('workshops')
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.cover_image !== undefined && { cover_image: data.cover_image || null }),
        ...(data.start_date !== undefined && { event_date: data.start_date }),
        ...(data.feishu_url !== undefined && { feishu_url: data.feishu_url || null }),
        ...(data.is_published !== undefined && { is_active: data.is_published }),
      })
      .eq('id', workshopId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

/**
 * 删除 Workshop
 */
export async function deleteWorkshop(workshopId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('workshops')
      .delete()
      .eq('id', workshopId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

/**
 * 切换 Workshop 发布状态
 */
export async function toggleWorkshopActive(workshopId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    // 获取当前状态
    const { data: workshop } = await supabase
      .from('workshops')
      .select('is_active')
      .eq('id', workshopId)
      .single();

    if (!workshop) {
      return { success: false, error: '活动不存在' };
    }

    // 切换状态
    const { error } = await supabase
      .from('workshops')
      .update({ is_active: !workshop.is_active })
      .eq('id', workshopId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateTag('workshops');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '操作失败' };
  }
}
