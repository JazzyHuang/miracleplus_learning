'use client';

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { createPointsService, type UserStreak } from '@/lib/points';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * 连续登录指示器
 * 在导航栏或用户卡片中显示火焰图标和天数
 */
export function StreakIndicator({ className = '' }: { className?: string }) {
  const { user } = useUser();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAndUpdateStreak = async () => {
      const supabase = createClient();
      const pointsService = createPointsService(supabase);
      
      // 更新连续登录（这会检查今天是否已登录）
      const result = await pointsService.updateStreak(user.id);
      
      // 如果获得了积分，显示动画
      if (result.pointsEarned > 0) {
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 2000);
      }

      // 获取当前状态
      const currentStreak = await pointsService.getUserStreak(user.id);
      setStreak(currentStreak);
    };

    fetchAndUpdateStreak();
  }, [user]);

  if (!user || !streak || streak.currentStreak === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <m.div
            className={`relative flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 cursor-default ${className}`}
            whileHover={{ scale: 1.05 }}
          >
            {/* 火焰图标 */}
            <m.div
              animate={
                showAnimation
                  ? {
                      scale: [1, 1.3, 1],
                      rotate: [0, -10, 10, 0],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            >
              <Flame
                className={`w-4 h-4 ${
                  streak.currentStreak >= 7
                    ? 'text-orange-500'
                    : 'text-orange-400'
                }`}
              />
            </m.div>

            {/* 天数 */}
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {streak.currentStreak}
            </span>

            {/* 积分获得动画 */}
            <AnimatePresence>
              {showAnimation && (
                <m.span
                  className="absolute -top-4 left-1/2 text-xs font-bold text-green-500"
                  initial={{ opacity: 0, y: 10, x: '-50%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  +5
                </m.span>
              )}
            </AnimatePresence>
          </m.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>连续登录 {streak.currentStreak} 天</p>
          {streak.longestStreak > streak.currentStreak && (
            <p className="text-xs text-muted-foreground">
              最长记录: {streak.longestStreak} 天
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
