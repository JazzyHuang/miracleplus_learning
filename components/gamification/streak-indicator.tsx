'use client';

import { useState, useCallback } from 'react';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { createPointsService, type UserStreak } from '@/lib/points';
import { useCachedQuery, seedCache } from '@/hooks/use-cached-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StreakIndicatorProps {
  className?: string;
  initialStreak?: UserStreak | null;
}

/**
 * Streak Indicator — 温暖的橙色主题，适配深色背景
 *
 * 性能优化：使用 useCachedQuery（5 分钟 TTL）缓存 streak 数据，
 * 导航间从全局 Map 缓存返回，避免每次 mount 都查询数据库。
 */
export function StreakIndicator({ className = '', initialStreak }: StreakIndicatorProps) {
  const { user } = useUser();
  const [showAnimation, setShowAnimation] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const userId = user?.id;

  // 服务端数据预填充缓存（仅 read 数据，write 仍在 fetcher 中执行）
  if (userId && initialStreak !== undefined) {
    seedCache(`streak-${userId}`, initialStreak);
  }

  const fetcher = useCallback(async (): Promise<UserStreak | null> => {
    if (!userId) return null;
    const supabase = createClient();
    const pointsService = createPointsService(supabase);

    // 当天首次：更新 streak（写入），sessionStorage 防重
    const streakKey = `streak-updated-${userId}-${new Date().toDateString()}`;
    if (!sessionStorage.getItem(streakKey)) {
      const result = await pointsService.updateStreak(userId);
      sessionStorage.setItem(streakKey, '1');

      if (result.pointsEarned > 0) {
        setEarnedPoints(result.pointsEarned);
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 2000);
      }
    }

    return pointsService.getUserStreak(userId);
  }, [userId]);

  const { data: streak } = useCachedQuery<UserStreak | null>(
    `streak-${userId}`,
    fetcher,
    { ttl: 300000, enabled: !!userId } // 5 分钟缓存
  );

  if (!user || !streak || streak.currentStreak === 0) {
    return null;
  }

  const isHotStreak = streak.currentStreak >= 7;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 cursor-default hover:scale-[1.02] active:scale-[0.98] transition-transform ${className}`}
          >
            {/* Flame icon */}
            <div
              className={showAnimation ? 'animate-like-pop' : ''}
            >
              <Flame
                className={`w-4 h-4 ${
                  isHotStreak ? 'text-warning' : 'text-warning/70'
                }`}
              />
            </div>

            {/* Days count */}
            <span className="text-sm font-semibold text-warning">
              {streak.currentStreak}
            </span>
            <span className="text-xs text-warning/60">天</span>

            {/* Points earned animation */}
            {showAnimation && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-success animate-fade-up"
              >
                +{earnedPoints}
              </span>
            )}

            {/* Hot streak glow */}
            {isHotStreak && (
              <div className="absolute inset-0 rounded-lg bg-warning/5 animate-pulse" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1">
            <p className="text-sm">连续登录 {streak.currentStreak} 天</p>
            {streak.longestStreak > streak.currentStreak && (
              <p className="text-xs text-muted-foreground">
                最长记录: {streak.longestStreak} 天
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
