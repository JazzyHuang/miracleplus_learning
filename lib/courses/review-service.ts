/**
 * 间隔重复复习服务 — SM-2 算法
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DB, RPC } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

export interface ReviewItem {
  id: string;
  questionId: string;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  nextReviewAt: string;
  question: {
    id: string;
    type: string;
    questionText: string;
    options: string[];
    correctAnswer: string | string[];
    explanation: string | null;
    lessonId: string;
  };
}

export interface ReviewResult {
  /** 0-5 评分: 0=完全忘记, 3=勉强记得, 5=完美记忆 */
  quality: number;
}

export class ReviewService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 获取待复习题目数量
   */
  async getDueCount(userId: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).rpc(RPC.get_due_review_count, {
      p_user_id: userId,
    });
    if (error) {
      logger.error('获取待复习数量失败:', error);
      return 0;
    }
    return data || 0;
  }

  /**
   * 获取待复习题目列表
   */
  async getDueReviews(userId: string, limit = 20): Promise<ReviewItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from(DB.review_schedule)
      .select('id, question_id, ease_factor, interval_days, review_count, next_review_at')
      .eq('user_id', userId)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('获取待复习题目失败:', error);
      return [];
    }

    // 批量获取题目信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schedules = (data || []) as any[];
    if (schedules.length === 0) return [];

    const questionIds = schedules.map((s) => s.question_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: questions } = await (this.supabase as any)
      .from(DB.questions)
      .select('id, type, question_text, options, correct_answer, explanation, lesson_id')
      .in('id', questionIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

    return schedules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = qMap.get(r.question_id) as any;
        if (!q) return null;
        return {
          id: r.id,
          questionId: r.question_id,
          easeFactor: r.ease_factor,
          intervalDays: r.interval_days,
          reviewCount: r.review_count,
          nextReviewAt: r.next_review_at,
          question: {
            id: q.id,
            type: q.type,
            questionText: q.question_text,
            options: q.options || [],
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            lessonId: q.lesson_id,
          },
        };
      })
      .filter((r): r is ReviewItem => r !== null);
  }

  /**
   * SM-2 算法：更新复习计划
   * quality: 0-5 (0=完全忘记, 5=完美记忆)
   */
  async updateReview(
    scheduleId: string,
    quality: number
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule } = await (this.supabase as any)
      .from(DB.review_schedule)
      .select('ease_factor, interval_days, review_count')
      .eq('id', scheduleId)
      .single();

    if (!schedule) return;

    let ef = schedule.ease_factor as number;
    let interval = schedule.interval_days as number;
    const count = (schedule.review_count as number) + 1;

    // SM-2 核心公式
    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ef < 1.3) ef = 1.3;

    if (quality < 3) {
      // 回答不佳，重置间隔
      interval = 1;
    } else {
      if (count === 1) interval = 1;
      else if (count === 2) interval = 3;
      else interval = Math.round(interval * ef);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from(DB.review_schedule)
      .update({
        ease_factor: ef,
        interval_days: interval,
        review_count: count,
        next_review_at: nextReview.toISOString(),
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);
  }

  /**
   * 将答错的题目加入复习计划
   */
  async addToReview(userId: string, questionId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any)
      .from(DB.review_schedule)
      .upsert({
        user_id: userId,
        question_id: questionId,
        ease_factor: 2.5,
        interval_days: 1,
        review_count: 0,
        next_review_at: new Date().toISOString(),
      }, { onConflict: 'user_id,question_id' });

    if (error) logger.error('添加复习计划失败:', error);
  }
}

export function createReviewService(supabase: SupabaseClient) {
  return new ReviewService(supabase);
}
