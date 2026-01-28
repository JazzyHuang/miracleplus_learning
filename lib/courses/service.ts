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
      const { data, error } = await this.supabase.rpc('mark_lesson_complete', {
        p_user_id: userId,
        p_lesson_id: lessonId,
        p_course_id: courseId,
      });

      if (error) {
        console.error('标记课时完成失败:', error);
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
      // 获取课程所有课时
      const { data: courseData } = await this.supabase
        .from('courses')
        .select(`
          chapters (
            lessons (id)
          )
        `)
        .eq('id', courseId)
        .single();

      const allLessonIds: string[] = courseData?.chapters?.flatMap(
        (c: { lessons?: { id: string }[] }) => c.lessons?.map((l) => l.id) || []
      ) || [];

      if (allLessonIds.length === 0) {
        return {
          courseId,
          totalLessons: 0,
          completedLessons: 0,
          percentage: 0,
          milestones: { fiftyPercent: false, hundredPercent: false },
        };
      }

      // 获取用户完成的课时
      const { count } = await this.supabase
        .from('user_lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_completed', true)
        .in('lesson_id', allLessonIds);

      const completedLessons = count || 0;
      const totalLessons = allLessonIds.length;
      const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // 获取里程碑状态
      const { data: milestones } = await this.supabase
        .from('course_milestones')
        .select('milestone_type')
        .eq('user_id', userId)
        .eq('course_id', courseId);

      const milestoneTypes = milestones?.map((m) => m.milestone_type) || [];

      return {
        courseId,
        totalLessons,
        completedLessons,
        percentage,
        milestones: {
          fiftyPercent: milestoneTypes.includes('50_percent'),
          hundredPercent: milestoneTypes.includes('100_percent'),
        },
      };
    } catch (error) {
      console.error('获取课程进度失败:', error);
      return null;
    }
  }

  /**
   * 获取用户已完成的课时 ID 列表
   */
  async getCompletedLessonIds(userId: string, courseId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('user_lesson_progress')
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
      .from('user_lesson_progress')
      .select('is_completed')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    return data?.is_completed || false;
  }

  /**
   * 发表课程感想
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
      const { error } = await this.supabase
        .from('course_reviews')
        .insert({
          user_id: userId,
          course_id: courseId,
          content,
        });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: '你已经发表过这门课程的感想了' };
        }
        return { success: false, error: error.message };
      }

      // 发放积分
      const { data: points } = await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: 50,
        p_action_type: 'COURSE_REVIEW',
        p_reference_id: courseId,
        p_reference_type: 'course',
        p_description: '发表课程感想',
      });

      return { success: true, pointsEarned: points || 0 };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
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
      .from('course_reviews')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取课程感想失败:', error);
      return [];
    }

    return data;
  }

  /**
   * 检查用户是否已发表感想
   */
  async hasUserReviewed(userId: string, courseId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('course_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    return !!data;
  }

  /**
   * 提问
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

    try {
      // 如果有悬赏，先检查积分余额
      if (data.bountyPoints && data.bountyPoints > 0) {
        const { data: balance } = await this.supabase
          .from('user_point_balance')
          .select('available_points')
          .eq('user_id', userId)
          .single();

        if (!balance || balance.available_points < data.bountyPoints) {
          return { success: false, error: '积分余额不足' };
        }

        // 扣除悬赏积分
        await this.supabase.rpc('add_user_points', {
          p_user_id: userId,
          p_points: -data.bountyPoints,
          p_action_type: 'BOUNTY_SET',
          p_reference_type: 'question',
          p_description: '设置问答悬赏',
        });
      }

      const { data: question, error } = await this.supabase
        .from('qa_questions')
        .insert({
          user_id: userId,
          course_id: courseId,
          lesson_id: data.lessonId || null,
          title: data.title,
          content: data.content,
          bounty_points: data.bountyPoints || 0,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 发放提问积分
      await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: 15,
        p_action_type: 'COURSE_QUESTION',
        p_reference_id: question.id,
        p_reference_type: 'question',
        p_description: '提问',
      });

      return { success: true, questionId: question.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
    }
  }

  /**
   * 回答问题
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
      const { data: answer, error } = await this.supabase
        .from('qa_answers')
        .insert({
          user_id: userId,
          question_id: questionId,
          content,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 发放回答积分
      await this.supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_points: 30,
        p_action_type: 'COURSE_ANSWER',
        p_reference_id: answer.id,
        p_reference_type: 'answer',
        p_description: '回答问题',
      });

      return { success: true, answerId: answer.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
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
      const { data } = await this.supabase.rpc('accept_answer', {
        p_question_id: questionId,
        p_answer_id: answerId,
        p_user_id: userId,
      });

      return { success: !!data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : '未知错误' };
    }
  }
}

/**
 * 创建课程服务实例
 */
export function createCoursesService(supabase: SupabaseClient): CoursesService {
  return new CoursesService(supabase);
}
