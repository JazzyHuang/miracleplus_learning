'use client';

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 离线状态指示器
 * 当网络断开时显示提示
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  // 性能修复：保存定时器引用，组件卸载时清理防止内存泄漏
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // 初始化状态
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      clearTimeout(reconnectTimerRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // 如果在线且不需要显示重连提示，不渲染
  if (isOnline && !showReconnected) return null;

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={isOnline ? 'online' : 'offline'}
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium',
          isOnline
            ? 'bg-success text-white'
            : 'bg-warning text-white'
        )}
      >
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              网络已恢复
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              当前处于离线状态，部分功能可能不可用
            </>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  );
}
