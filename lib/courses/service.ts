/**
 * 课程服务
 * 
 * 提供课程相关的业务逻辑，包括：
 * - 标记课时完成
 * - 感想发表
 * - 问答管理
 * - 笔记管理
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { DB, RPC } from '@/lib/db-tables';

/**
 * 标记完成结果
 */
export interface MarkCompleteResult {
  success: boolean;
  pointsEarned: number;
  milestoneAchieved: string | null;
  milestonePoints: number;
  error?: string;
}

/**
 * 课程进度信息
 */
export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  milestones: {
    fiftyPercent: boolean;
    hundredPercent: boolean;
  };
}

/**
 * 课程服务类
 */
export class CoursesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 标记课时完成
   * 通过数据库函数保证原子性和里程碑检查
   */
  async markLessonComplete(
    userId: string,
    lessonId: string,
    courseId: string
  ): Promise<MarkCompleteResult> {
    try {
      const { data, error } = await this.supabase.rpc(RPC.mark_lesson_complete, {
        p_user_id: userId,
        p_lesson_id: lessonId,
        p_course_id: courseId,
      });

      if (error) {
        logger.error('标记课时完成失败:', error);
        return {
          success: false,
          pointsEarned: 0,
          milestoneAchieved: null,
          milestonePoints: 0,
          error: error.message,
        };
      }

      const result = data?.[0] || data;
      return {
        success: true,
        pointsEarned: result?.points_earned || 0,
        milestoneAchieved: result?.milestone_achieved || null,
        milestonePoints: result?.milestone_points || 0,
      };
    } catch (err) {
      return {
        success: false,
        pointsEarned: 0,
        milestoneAchieved: null,
        milestonePoints: 0,
        error: err instanceof Error ? err.message : '未知错误',
      };
    }
  }

  /**
   * 获取课程进度
   */
  async getCourseProgress(
    userId: string,
    courseId: string
  ): Promise<CourseProgress | null> {
    try {
      // 性能优化：使用单个 RPC 调用替代原来的 3 次查询（节省 60-120ms）
      const { data, error } = await this.supabase.rpc(RPC.get_user_course_progress, {
        p_user_id: userId,
        p_course_id: courseId,
      });

      if (error) {
        logger.error('获取课程进度失败:', error);
        return null;
      }

      const result = data as {
        total_lessons: number;
        completed_lessons: number;
        percentage: number;
        total_time_spent: number;
        milestones: string[];
      } | null;

      if (!result) {
        return {
          courseId,
          totalLessons: 0,
          completedLessons: 0,
          percentage: 0,
          milestones: { fiftyPercent: false, hundredPercent: false },
        };
      }

      const milestoneTypes = result.milestones || [];

      return {
        courseId,
        totalLessons: result.total_lessons,
        completedLessons: result.completed_lessons,
        percentage: result.percentage,
        milestones: {
          fiftyPercent: milestoneTypes.includes('50_percent'),
          hundredPercent: milestoneTypes.includes('100_percent'),
        },
      };
    } catch (error) {
      logger.error('获取课程进度失败:', error);
      return null;
    }
  }

  /**
   * 获取用户已完成的课时 ID 列表
   */
  async getCompletedLessonIds(userId: string, courseId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from(DB.user_lesson_progress)
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_completed', true);

    return data?.map((d) => d.lesson_id) || [];
  }

  /**
   * 检查课时是否已完成
   */
  async isLessonCompleted(userId: string, lessonId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from(DB.user_lesson_progress)
      .select('is_completed')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    return data?.is_completed || false;
  }

  /**
   * 发表课程感想（原子操作 — 通过 RPC 保证插入+积分的一致性）
   */
  async submitCourseReview(
    userId: string,
    courseId: string,
    content: string
  ): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    if (content.length < 50) {
      return { success: false, error: '感想内容至少 50 字' };
    }

    try {
      const { data, error } = await this.supabase.rpc(RPC.submit_course_review, {
        p_user_id: userId,
        p_course_id: courseId,
        p_content: content,
      });

      if (error) {
        logger.error('submitCourseReview RPC failed:', error);
        return { success: false, error: '提交失败，请稍后重试' };
      }

      const result = data as { success: boolean; review_id?: string; points_earned?: number; error?: string };
      if (!result?.success) {
        return { success: false, error: result?.error || '提交失败' };
      }

      return { success: true, pointsEarned: result.points_earned || 0 };
    } catch (err) {
      logger.error('submitCourseReview error:', err);
      return { success: false, error: '提交失败，请稍后重试' };
    }
  }

  /**
   * 获取课程感想列表
   */
  async getCourseReviews(
    courseId: string,
    options: { limit?: number; featuredOnly?: boolean } = {}
  ) {
    const { limit = 20, featuredOnly = false } = options;

    let query = this.supabase
      .from(DB.course_reviews)
      .select(`
        *,
        user:${DB.users} (id, name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('获取课程感想失败:', error);
      return [];
    }

    return data;
  }

  /**
   * 检查用户是否已发表感想
   */
  async hasUserReviewed(userId: string, courseId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from(DB.course_reviews)
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    return !!data;
  }

  /**
   * 提问（原子操作 — 通过 RPC 保证插入问题+扣悬赏+发积分的一致性）
   */
  async submitQuestion(
    userId: string,
    courseId: string,
    data: {
      title: string;
      content: string;
      lessonId?: string;
      bountyPoints?: number;
    }
  ): Promise<{ success: boolean; questionId?: string; error?: string }> {
    if (data.content.length < 20) {
      return { success: false, error: '问题内容至少 20 字' };
    }

    // 悬赏上限校验（与数据库函数一致: 100 积分）
    if (data.bountyPoints && data.bountyPoints > 100) {
      return { success: false, error: '悬赏上限为 100 积分' };
    }

    try {
      // 使用 RPC 原子操作：插入问题 + 扣悬赏 + 发提问积分
      const { data: result, error } = await this.supabase.rpc(RPC.submit_question_with_bounty, {
        p_user_id: userId,
        p_course_id: courseId,
        p_lesson_id: data.lessonId || null,
        p_title: data.title,
        p_content: data.content,
        p_bounty_points: data.bountyPoints || 0,
      });

      if (error) {
        logger.error('submitQuestion RPC failed:', error);
        return { success: false, error: '提交失败，请稍后重试' };
      }

      const rpcResult = result as { success: boolean; question_id?: string; error?: string };
      if (!rpcResult?.success) {
        return { success: false, error: rpcResult?.error || '提交失败' };
      }

      return { success: true, questionId: rpcResult.question_id };
    } catch (err) {
      logger.error('submitQuestion error:', err);
      return { success: false, error: '提交失败，请稍后重试' };
    }
  }

  /**
   * 回答问题（原子操作 — 通过 RPC 保证插入+积分的一致性）
   * 安全修复：禁止自问自答（防止套利）— 在 RPC 内部检查
   */
  async submitAnswer(
    userId: string,
    questionId: string,
    content: string
  ): Promise<{ success: boolean; answerId?: string; error?: string }> {
    if (content.length < 20) {
      return { success: false, error: '回答内容至少 20 字' };
    }

    try {
      const { data, error } = await this.supabase.rpc(RPC.submit_answer, {
        p_user_id: userId,
        p_question_id: questionId,
        p_content: content,
      });

      if (error) {
        logger.error('submitAnswer RPC failed:', error);
        return { success: false, error: '提交失败，请稍后重试' };
      }

      const result = data as { success: boolean; answer_id?: string; points_earned?: number; error?: string };
      if (!result?.success) {
        return { success: false, error: result?.error || '提交失败' };
      }

      return { success: true, answerId: result.answer_id };
    } catch (err) {
      logger.error('submitAnswer error:', err);
      return { success: false, error: '提交失败，请稍后重试' };
    }
  }

  /**
   * 采纳答案
   */
  async acceptAnswer(
    userId: string,
    questionId: string,
    answerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data } = await this.supabase.rpc(RPC.accept_answer, {
        p_question_id: questionId,
        p_answer_id: answerId,
        p_user_id: userId,
      });

      return { success: !!data };
    } catch (err) {
      logger.error('acceptAnswer error:', err);
      return { success: false, error: '操作失败，请稍后重试' };
    }
  }
}

/**
 * 创建课程服务实例
 */
export function createCoursesService(supabase: SupabaseClient): CoursesService {
  return new CoursesService(supabase);
}
