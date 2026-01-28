'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // 初始化状态
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // 3秒后隐藏重连提示
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 如果在线且不需要显示重连提示，不渲染
  if (isOnline && !showReconnected) return null;

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={isOnline ? 'online' : 'offline'}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium',
          isOnline
            ? 'bg-green-500 text-white'
            : 'bg-amber-500 text-white'
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
