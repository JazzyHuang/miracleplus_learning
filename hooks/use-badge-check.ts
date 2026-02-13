'use client';

import { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createBadgesService } from '@/lib/points/badges';
import { useUser } from '@/contexts/user-context';
import { logger } from '@/lib/logger';

/**
 * 徽章检查 Hook
 *
 * 在关键操作后触发徽章解锁检查。
 * - 500ms 防抖，避免快速连续操作触发多次检查
 * - fire-and-forget，通知由 NotificationProvider 的 Realtime 订阅处理
 * - 不返回结果，不显示 toast（避免与 NotificationProvider 双重通知）
 */
export function useBadgeCheck() {
  const { user } = useUser();
  const pendingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const checkBadges = useCallback(() => {
    if (!user || pendingRef.current) return;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      pendingRef.current = true;
      try {
        const supabase = createClient();
        const badgesService = createBadgesService(supabase);
        await badgesService.checkAndUnlockBadges(user.id);
      } catch (err) {
        logger.error('Badge check failed:', err);
      } finally {
        pendingRef.current = false;
      }
    }, 500);
  }, [user]);

  return { checkBadges };
}
