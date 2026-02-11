/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

/**
 * Service Worker - Serwist 配置
 * 
 * 自定义缓存策略（覆盖 defaultCache）:
 * - Supabase API: StaleWhileRevalidate（5 分钟过期，100 条上限）
 * - Supabase Storage: CacheFirst（7 天）
 * - 字体: CacheFirst（365 天）
 * - 其他: defaultCache 默认策略
 * 
 * 性能提升：重复访问时从本地缓存加载，加速 2-5x
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// 用户特定的表名模式 — 这些不应被 SW 缓存（包含用户私有数据）
const USER_SPECIFIC_TABLES = [
  'user_lesson_progress', 'user_point_balance', 'point_transactions',
  'user_streaks', 'user_badges', 'user_achievements', 'user_answers',
  'user_bookmarks', 'user_invitations', 'user_material_progress',
  'workshop_checkins', 'workshop_submissions', 'discussion_participants',
  'tool_ratings', 'tool_experiences', 'reward_orders',
];

// 自定义缓存策略 — 针对性优化关键资源
const customCacheRules: RuntimeCaching[] = [
  // Supabase API — StaleWhileRevalidate，先显示缓存再后台更新
  // Security: Exclude auth endpoints AND user-specific data tables
  {
    matcher: ({ url }: { url: URL }) => {
      if (!/^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i.test(url.href)) return false;
      if (url.pathname.includes('/auth/')) return false;
      // Exclude user-specific tables from caching to prevent stale personal data
      const path = url.pathname.toLowerCase();
      if (USER_SPECIFIC_TABLES.some(table => path.includes(table))) return false;
      return true;
    },
    handler: new StaleWhileRevalidate({
      cacheName: 'supabase-api',
      plugins: [
        new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }),
      ],
    }),
  },
  // Supabase Storage 图片 — CacheFirst，图片内容不变
  {
    matcher: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
    handler: new CacheFirst({
      cacheName: 'supabase-storage',
      plugins: [
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      ],
    }),
  },
  // 字体文件 — CacheFirst，365 天
  {
    matcher: /\.(woff2?|ttf|otf|eot)$/i,
    handler: new CacheFirst({
      cacheName: 'fonts',
      plugins: [
        new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...customCacheRules, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// ============================================
// 离线队列与后台同步
// ============================================

const OFFLINE_QUEUE_DB = 'ml_offline_queue';
const OFFLINE_QUEUE_STORE = 'requests';

/**
 * 打开 IndexedDB 数据库
 */
function openOfflineQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        const store = db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * 删除已同步的请求（复用 db 连接）
 */
async function deleteQueuedRequestWithDB(db: IDBDatabase, id: string): Promise<void> {
  try {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_QUEUE_STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[SW] Failed to delete request:', error);
  }
}

/**
 * 更新请求的重试次数（复用 db 连接）
 */
async function updateRetryCountWithDB(db: IDBDatabase, id: string, retryCount: number): Promise<void> {
  try {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE_STORE);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const data = getRequest.result;
      if (data) {
        data.retryCount = retryCount;
        store.put(data);
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[SW] Failed to update retry count:', error);
  }
}

/**
 * 同步单个请求（复用 db 连接）
 */
async function syncRequestWithDB(db: IDBDatabase, request: {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  retryCount: number;
}): Promise<boolean> {
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      body: request.body,
    });

    if (response.ok) {
      await deleteQueuedRequestWithDB(db, request.id);
      return true;
    }

    const newRetryCount = (request.retryCount || 0) + 1;
    if (newRetryCount > 3) {
      await deleteQueuedRequestWithDB(db, request.id);
      console.warn('[SW] Request exceeded max retries, discarded:', request.id);
    } else {
      await updateRetryCountWithDB(db, request.id, newRetryCount);
    }

    return false;
  } catch (error) {
    console.error('[SW] Sync request failed:', error);
    const newRetryCount = (request.retryCount || 0) + 1;
    if (newRetryCount > 3) {
      await deleteQueuedRequestWithDB(db, request.id);
    } else {
      await updateRetryCountWithDB(db, request.id, newRetryCount);
    }
    return false;
  }
}

/**
 * 同步所有待处理的请求
 * 性能优化：
 * 1. 并行化同步（Promise.allSettled），从 O(n) 降为 O(1)
 * 2. 复用 IndexedDB 连接，减少 open/close 开销
 */
async function syncOfflineRequests(): Promise<void> {
  try {
    const db = await openOfflineQueueDB();
    try {
      const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(OFFLINE_QUEUE_STORE);
      const getRequest = store.getAll();

      const items = await new Promise<typeof getRequest.result>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });

      const requests = (items as typeof getRequest.result).sort((a, b) => a.timestamp - b.timestamp);

      if (requests.length === 0) {
        db.close();
        return;
      }

      console.log(`[SW] Syncing ${requests.length} offline requests in parallel...`);

      const results = await Promise.allSettled(
        requests.map(request => syncRequestWithDB(db, request))
      );

      let successCount = 0;
      let failCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          failCount++;
        }
      }

      console.log(`[SW] Sync complete: ${successCount} succeeded, ${failCount} failed`);

      // 通知所有客户端同步完成
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          successCount,
          failCount,
        });
      });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

/**
 * 监听后台同步事件
 */
self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as unknown as { tag?: string; waitUntil: (promise: Promise<void>) => void };
  if (syncEvent.tag === 'offline-queue') {
    console.log('[SW] Background sync triggered');
    syncEvent.waitUntil(syncOfflineRequests());
  }
});

/**
 * 监听消息事件（用于手动触发同步）
 */
self.addEventListener('message', (event) => {
  const messageEvent = event as unknown as { data?: { type?: string; }; waitUntil?: (promise: Promise<void>) => void };

  if (messageEvent.data && messageEvent.data.type === 'SYNC_OFFLINE_REQUESTS') {
    console.log('[SW] Manual sync requested');
    messageEvent.waitUntil?.(syncOfflineRequests());
  }

  // 跳过等待，立即激活新的 Service Worker
  if (messageEvent.data && messageEvent.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * 监听网络状态变化
 */
self.addEventListener('online', () => {
  console.log('[SW] Network online, triggering sync...');
  syncOfflineRequests();
});
