'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { awardPointsAction } from '@/app/actions/points';
import { logger } from '@/lib/logger';

interface ReadingState {
  timeSpent: number;
  scrollDepth: number;
  completed: boolean;
  pointsAwarded: boolean;
}

interface UseReadingTrackerOptions {
  /** 完成阅读所需的最低停留时间(秒), 默认 120 */
  minReadingTime?: number;
  /** 完成阅读所需的最低滚动深度 (0-1), 默认 0.7 */
  minScrollDepth?: number;
  /** 保存间隔(毫秒), 默认 10000 */
  saveInterval?: number;
}

/**
 * 阅读时间追踪 Hook
 * 
 * 使用 IntersectionObserver + Page Visibility API + scroll depth
 * 追踪用户的真实阅读行为，防止刷分。
 * 
 * 完成条件: timeSpent >= minReadingTime AND scrollDepth >= minScrollDepth
 * 
 * 防作弊:
 * - 页面不在前台时暂停计时 (visibilitychange)
 * - 文章内容不在视口中时暂停计时 (IntersectionObserver)
 * - 使用 sendBeacon 在页面关闭时发送最终数据
 */
export function useReadingTracker(
  articleId: string,
  userId: string | undefined,
  contentRef: React.RefObject<HTMLElement | null>,
  options: UseReadingTrackerOptions = {}
) {
  const {
    minReadingTime = 120,
    minScrollDepth = 0.7,
    saveInterval = 10000,
  } = options;

  const [state, setState] = useState<ReadingState>({
    timeSpent: 0,
    scrollDepth: 0,
    completed: false,
    pointsAwarded: false,
  });

  // Tracking refs
  const isVisibleRef = useRef(true);      // 文章内容是否在视口中
  const isPageActiveRef = useRef(true);    // 页面是否在前台
  const lastTickRef = useRef(0);           // 上次计时点
  const timeSpentRef = useRef(0);
  const scrollDepthRef = useRef(0);
  const completedRef = useRef(false);
  const savedRef = useRef(false);

  // Save progress to database
  const saveProgress = useCallback(async (forceComplete = false) => {
    if (!userId || savedRef.current) return;

    const completed = forceComplete || (
      timeSpentRef.current >= minReadingTime &&
      scrollDepthRef.current >= minScrollDepth
    );

    try {
      const supabase = createClient();
      await supabase.from(DB.article_reads).upsert({
        user_id: userId,
        article_id: articleId,
        time_spent: Math.round(timeSpentRef.current),
        scroll_depth: Math.round(scrollDepthRef.current * 100) / 100,
        completed,
        points_awarded: completedRef.current,
      }, { onConflict: 'user_id,article_id' });

      // Award points on first completion
      if (completed && !completedRef.current) {
        completedRef.current = true;
        savedRef.current = true;

        // Determine article type for points
        const { data: article } = await supabase
          .from(DB.articles)
          .select('type')
          .eq('id', articleId)
          .single() as { data: { type: string } | null };

        const actionType = article?.type === 'monthly' ? 'ARTICLE_READ_MONTHLY' : 'ARTICLE_READ';

        await awardPointsAction(
          actionType as 'ARTICLE_READ' | 'ARTICLE_READ_MONTHLY',
          articleId,
          'article',
          article?.type === 'monthly' ? '月报阅读' : '日报阅读'
        );

        setState(prev => ({ ...prev, completed: true, pointsAwarded: true }));
      }
    } catch (error) {
      logger.error('保存阅读进度失败:', error);
    }
  }, [userId, articleId, minReadingTime, minScrollDepth]);

  // Time tracking interval
  useEffect(() => {
    if (!userId) return;

    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      // Only count time if page is active AND content is visible
      if (isPageActiveRef.current && isVisibleRef.current) {
        const now = Date.now();
        const elapsed = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;

        // Cap elapsed to interval + 1s to prevent jump after sleep
        const cappedElapsed = Math.min(elapsed, saveInterval / 1000 + 1);
        timeSpentRef.current += cappedElapsed;

        setState(prev => ({
          ...prev,
          timeSpent: Math.round(timeSpentRef.current),
        }));
      } else {
        lastTickRef.current = Date.now();
      }

      // Auto-save periodically
      saveProgress();
    }, saveInterval);

    return () => {
      clearInterval(interval);
      // Final save on unmount — directly call saveProgress
      // (sendBeacon to /api/progress was incorrect: that endpoint expects lesson data, not article data)
      if (userId && timeSpentRef.current > 0) {
        saveProgress();
      }
    };
  }, [userId, articleId, saveInterval, saveProgress]);

  // Page Visibility API
  useEffect(() => {
    const handleVisibility = () => {
      isPageActiveRef.current = document.visibilityState === 'visible';
      if (isPageActiveRef.current) {
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // IntersectionObserver for content visibility
  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            lastTickRef.current = Date.now();
          }
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [contentRef]);

  // Scroll depth tracking
  useEffect(() => {
    const handleScroll = () => {
      const element = contentRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = element.scrollHeight;

      if (elementHeight <= 0) return;

      // Calculate how much of the content has been scrolled past
      const scrolledPast = Math.max(0, -rect.top + windowHeight);
      const depth = Math.min(1, scrolledPast / elementHeight);

      if (depth > scrollDepthRef.current) {
        scrollDepthRef.current = depth;
        setState(prev => ({
          ...prev,
          scrollDepth: Math.round(depth * 100) / 100,
        }));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentRef]);

  return {
    ...state,
    progress: Math.min(100, Math.round(
      (Math.min(state.timeSpent / minReadingTime, 1) * 0.6 +
       Math.min(state.scrollDepth / minScrollDepth, 1) * 0.4) * 100
    )),
  };
}
