'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LessonProgress {
  isCompleted: boolean;
  lastPosition: number;
  timeSpent: number;
  completedAt: string | null;
}

interface UseLessonProgressOptions {
  /** 自动保存间隔（毫秒），默认 30 秒 */
  autoSaveInterval?: number;
  /** 是否启用阅读时间追踪 */
  trackTime?: boolean;
}

/**
 * 课程学习进度 Hook
 * 追踪用户的学习进度，支持断点续学
 * 
 * 修复：
 * 1. 使用 useRef 存储最新进度，避免 saveProgress 依赖 progress 导致的循环
 * 2. 修复自动保存的闭包陷阱
 */
export function useLessonProgress(
  lessonId: string,
  courseId: string,
  userId?: string,
  options: UseLessonProgressOptions = {}
) {
  const { autoSaveInterval = 30000, trackTime = true } = options;

  const [progress, setProgress] = useState<LessonProgress>({
    isCompleted: false,
    lastPosition: 0,
    timeSpent: 0,
    completedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 使用 ref 存储最新进度，避免依赖循环
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // 使用 ref 存储 saving 状态，避免重复保存
  const savingRef = useRef(false);

  // 加载进度
  useEffect(() => {
    const loadProgress = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('user_lesson_progress')
          .select('is_completed, last_position, time_spent, completed_at')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .single();

        if (data && !error) {
          setProgress({
            isCompleted: data.is_completed,
            lastPosition: data.last_position,
            timeSpent: data.time_spent,
            completedAt: data.completed_at,
          });
        }
      } catch (error) {
        console.error('加载学习进度失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [userId, lessonId]);

  // 保存进度 - 移除 progress 依赖，使用 progressRef
  const saveProgress = useCallback(async (
    updates: Partial<LessonProgress>
  ) => {
    if (!userId) return false;
    
    // 防止重复保存
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);

    try {
      const supabase = createClient();
      const currentProgress = progressRef.current;
      
      const { error } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          is_completed: updates.isCompleted ?? currentProgress.isCompleted,
          last_position: updates.lastPosition ?? currentProgress.lastPosition,
          time_spent: updates.timeSpent ?? currentProgress.timeSpent,
          completed_at: updates.isCompleted ? new Date().toISOString() : currentProgress.completedAt,
        }, {
          onConflict: 'user_id,lesson_id',
        });

      if (error) throw error;

      setProgress((prev) => ({
        ...prev,
        ...updates,
        completedAt: updates.isCompleted ? new Date().toISOString() : prev.completedAt,
      }));

      return true;
    } catch (error) {
      console.error('保存学习进度失败:', error);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [userId, lessonId, courseId]); // 移除 progress 依赖

  // 标记完成
  const markComplete = useCallback(async () => {
    return saveProgress({ isCompleted: true });
  }, [saveProgress]);

  // 更新阅读位置
  const updatePosition = useCallback(async (position: number) => {
    return saveProgress({ lastPosition: position });
  }, [saveProgress]);

  // 自动追踪阅读时间 - 修复闭包陷阱
  useEffect(() => {
    if (!userId || !trackTime) return;

    let elapsedSeconds = 0;
    
    const interval = setInterval(() => {
      elapsedSeconds += autoSaveInterval / 1000;
      
      // 使用 ref 获取最新进度，避免闭包陷阱
      const currentTimeSpent = progressRef.current.timeSpent;
      
      // 每隔一段时间自动保存
      saveProgress({
        timeSpent: currentTimeSpent + elapsedSeconds,
      });
      elapsedSeconds = 0;
    }, autoSaveInterval);

    return () => {
      clearInterval(interval);
      // 组件卸载时保存剩余时间
      if (elapsedSeconds > 0) {
        const currentTimeSpent = progressRef.current.timeSpent;
        saveProgress({
          timeSpent: currentTimeSpent + elapsedSeconds,
        });
      }
    };
  }, [userId, trackTime, autoSaveInterval, saveProgress]); // 移除 progress.timeSpent 依赖

  return {
    progress,
    loading,
    saving,
    markComplete,
    updatePosition,
    saveProgress,
  };
}

/**
 * 获取课程完成进度
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<{ completed: number; total: number; percentage: number }> {
  try {
    const supabase = createClient();
    
    // 获取课程所有课时数
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, chapter:chapters!inner(course_id)')
      .eq('chapter.course_id', courseId);

    const total = lessons?.length || 0;

    if (total === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    // 获取用户完成的课时数
    const { data: progress } = await supabase
      .from('user_lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_completed', true);

    const completed = progress?.length || 0;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  } catch (error) {
    console.error('获取课程进度失败:', error);
    return { completed: 0, total: 0, percentage: 0 };
  }
}

/**
 * 获取用户最后学习的课时
 */
export async function getLastLearnedLesson(
  userId: string,
  courseId?: string
): Promise<{ lessonId: string; courseId: string } | null> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('user_lesson_progress')
      .select('lesson_id, course_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data } = await query.single();

    if (data) {
      return {
        lessonId: data.lesson_id,
        courseId: data.course_id,
      };
    }

    return null;
  } catch (error) {
    console.error('获取最后学习课时失败:', error);
    return null;
  }
}
