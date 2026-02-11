'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatus {
  pending: number;
  syncing: boolean;
  lastSync: Date | null;
}

/**
 * 同步状态指示器
 * 显示离线队列的同步状态
 */
export function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    syncing: false,
    lastSync: null,
  });
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // 开发模式下没有 Service Worker，直接跳过
    if (process.env.NODE_ENV === 'development' && !navigator.serviceWorker) {
      return;
    }

    // 监听网络状态
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 监听 Service Worker 消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        setSyncStatus((prev) => ({
          ...prev,
          syncing: false,
          pending: Math.max(0, prev.pending - event.data.successCount),
          lastSync: new Date(),
        }));

        // 显示同步完成状态
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // 手动触发同步
  const triggerSync = () => {
    if (navigator.serviceWorker?.controller) {
      setSyncStatus((prev) => ({ ...prev, syncing: true }));
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_OFFLINE_REQUESTS',
      });
    }
  };

  // 如果在线且没有待处理请求，不显示
  if (isOnline && syncStatus.pending === 0 && !showStatus) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm shadow-lg transition-all',
        isOnline
          ? 'bg-green-500/10 text-green-500 border border-green-500/20'
          : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
      )}
    >
      {isOnline ? (
        <>
          {syncStatus.syncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在同步...</span>
            </>
          ) : syncStatus.pending > 0 ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>
                {syncStatus.pending} 个请求待同步
                <button
                  onClick={triggerSync}
                  className="ml-2 underline hover:no-underline"
                >
                  立即同步
                </button>
              </span>
            </>
          ) : showStatus && syncStatus.lastSync ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>同步完成</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              <span>已连接</span>
            </>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>离线模式 - 操作将保存后同步</span>
        </>
      )}
    </div>
  );
}

/**
 * 获取离线队列统计
 */
export async function getOfflineQueueStats(): Promise<{ totalCount: number }> {
  return new Promise((resolve) => {
    const request = indexedDB.open('ml_offline_queue', 1);

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('requests', 'readonly');
      const store = tx.objectStore('requests');
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        resolve({ totalCount: countRequest.result });
        db.close();
      };

      countRequest.onerror = () => {
        resolve({ totalCount: 0 });
        db.close();
      };
    };

    request.onerror = () => {
      resolve({ totalCount: 0 });
    };
  });
}
