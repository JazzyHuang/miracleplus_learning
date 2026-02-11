'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { useUser } from '@/contexts/user-context';
import { useCelebration } from '@/components/gamification/celebration-provider';
import { toast } from 'sonner';
import { Flame } from 'lucide-react';

/**
 * 实时通知 Provider
 * 
 * 使用 Supabase Realtime 监听用户的关键事件:
 * - 徽章解锁 → confetti 庆祝动画
 * - 等级提升 → emoji 庆祝动画
 * - Streak 保护提醒 → 18:00后未活动时提示
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { celebrate } = useCelebration();
  const lastCheckRef = useRef<string | null>(null);

  // 性能优化：使用 ref 隔离 celebrate，避免其引用变化导致 Realtime 重连
  const celebrateRef = useRef(celebrate);
  useEffect(() => {
    celebrateRef.current = celebrate;
  });

  // 性能优化：仅依赖 user?.id，避免 user 对象引用变化导致 Realtime 重连
  const userId = user?.id;

  // Listen for badge unlocks via Supabase Realtime
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Subscribe to user_badges inserts for this user
    const badgeChannel = supabase
      .channel(`badges-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: DB.user_badges,
          filter: `user_id=eq.${userId}`,
        },
        async (payload: { new: { badge_id: string } }) => {
          // Fetch badge details
          const { data: badge } = await supabase
            .from(DB.badges)
            .select('name, description')
            .eq('id', payload.new.badge_id)
            .single();

          if (badge) {
            celebrateRef.current('confetti');
            toast.success(`解锁新徽章: ${badge.name}!`, {
              description: badge.description || undefined,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to level changes
    const levelChannel = supabase
      .channel(`level-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: DB.user_point_balance,
          filter: `user_id=eq.${userId}`,
        },
        (payload: { old?: { level?: number }; new?: { level?: number } }) => {
          const oldLevel = payload.old?.level;
          const newLevel = payload.new?.level;
          if (oldLevel !== undefined && newLevel !== undefined && newLevel > oldLevel) {
            celebrateRef.current('emoji');
            const levelNames: Record<number, string> = { 1: 'AI 观察员', 2: 'AI 实践家', 3: 'AI 领航员' };
            toast.success(`恭喜升级为 ${levelNames[newLevel] ?? `等级 ${newLevel}`}!`, {
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(badgeChannel);
      supabase.removeChannel(levelChannel);
    };
  }, [userId]);

  // Streak protection reminder - check at 18:00+
  // 使用 userId（稳定的原始值）作为依赖，避免 user 对象引用变化导致重复触发
  useEffect(() => {
    if (!userId) return;

    const checkStreak = () => {
      const now = new Date();
      const hour = now.getHours();
      const today = now.toDateString();

      // Only remind after 18:00 and once per day
      if (hour >= 18 && lastCheckRef.current !== today) {
        lastCheckRef.current = today;

        // Check if user has any activity today
        const sessionKey = `streak-activity-${today}`;
        const hasActivity = sessionStorage.getItem(sessionKey);

        if (!hasActivity) {
          toast.warning('你的连续登录 streak 即将断裂!', {
            description: '完成任意学习操作即可保持',
            duration: 8000,
            icon: <Flame className="w-5 h-5 text-destructive animate-pulse" />,
          });
        }
      }
    };

    // Check immediately and then every 30 minutes
    checkStreak();
    const interval = setInterval(checkStreak, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  return <>{children}</>;
}
