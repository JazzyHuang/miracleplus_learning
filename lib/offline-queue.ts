/**
 * 离线请求队列 - 使用 IndexedDB 存储
 *
 * 当用户离线时，将 API 请求存储在 IndexedDB 中
 * 当网络恢复时，自动同步这些请求
 *
 * 主要用于：
 * - 课程进度保存
 * - 用户资料更新
 * - 积分记录
 */

import { logger } from '@/lib/logger';

/**
 * 存储的离线请求
 */
export interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
  metadata?: {
    userId?: string;
    description?: string;
  };
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  requestId: string;
  error?: string;
}

const DB_NAME = 'ml_offline_queue';
const STORE_NAME = 'requests';
const DB_VERSION = 1;

/**
 * 打开 IndexedDB 数据库
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error('IndexedDB 打开失败', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * 离线队列管理器
 */
export class OfflineQueue {
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    try {
      this.db = await openDB();
      logger.info('离线队列初始化成功');
    } catch (error) {
      logger.error('离线队列初始化失败', error);
      throw error;
    }
  }

  /**
   * 确保数据库已初始化（私有辅助方法）
   * 此方法保证返回后 this.db 非空
   */
  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    // 如果 init() 成功了，this.db 一定存在
    // 如果 init() 失败了，会抛出异常
  }

  /**
   * 添加请求到队列
   */
  async addRequest(request: QueuedRequest): Promise<string> {
    await this.ensureDb();

    try {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const requestToAdd = {
        ...request,
        id: undefined, // 让 autoIncrement 生成
        timestamp: request.timestamp || Date.now(),
        retryCount: 0,
      };

      const requestRef = store.add(requestToAdd);

      await this.completeTransaction(tx);

      const id = await new Promise<string>((resolve, reject) => {
        requestRef.onsuccess = () => resolve(String(requestRef.result));
        requestRef.onerror = () => reject(requestRef.error);
      });

      logger.info('请求已添加到离线队列', { id, url: request.url });
      return id;
    } catch (error) {
      logger.error('添加请求到离线队列失败', error);
      throw error;
    }
  }

  /**
   * 获取所有待同步的请求
   */
  async getPendingRequests(): Promise<QueuedRequest[]> {
    await this.ensureDb();

    try {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      await this.completeTransaction(tx);

      const requests = await new Promise<QueuedRequest[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as QueuedRequest[]);
        request.onerror = () => reject(request.error);
      });

      // 按时间戳排序，旧的请求优先
      return requests.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('获取待同步请求失败', error);
      return [];
    }
  }

  /**
   * 删除请求
   */
  async deleteRequest(id: string): Promise<void> {
    await this.ensureDb();

    try {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);

      await this.completeTransaction(tx);

      logger.debug('请求已从队列中删除', { id });
    } catch (error) {
      logger.error('删除请求失败', error);
      throw error;
    }
  }

  /**
   * 更新请求重试次数
   */
  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    await this.ensureDb();

    try {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const data = getRequest.result as QueuedRequest | undefined;
        if (data) {
          data.retryCount = retryCount;
          store.put(data);
        }
      };

      await this.completeTransaction(tx);
    } catch (error) {
      logger.error('更新重试次数失败', error);
    }
  }

  /**
   * 清理旧的请求（超过 7 天）
   */
  async cleanupOldRequests(): Promise<number> {
    await this.ensureDb();

    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(sevenDaysAgo);

      const request = index.openCursor(range);
      const deletedIds: string[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          deletedIds.push(cursor.primaryKey as string);
          cursor.delete();
          cursor.continue();
        }
      };

      await this.completeTransaction(tx);

      logger.info('清理旧离线请求', { count: deletedIds.length });
      return deletedIds.length;
    } catch (error) {
      logger.error('清理旧请求失败', error);
      return 0;
    }
  }

  /**
   * 获取队列统计信息
   */
  async getStats(): Promise<{ totalCount: number; pendingCount: number }> {
    await this.ensureDb();

    try {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countRequest = store.count();

      await this.completeTransaction(tx);

      const totalCount = await new Promise<number>((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

      return {
        totalCount,
        pendingCount: totalCount,
      };
    } catch (error) {
      logger.error('获取队列统计失败', error);
      return { totalCount: 0, pendingCount: 0 };
    }
  }

  /**
   * 完成事务并等待完成
   */
  private completeTransaction(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// 全局离线队列实例
let globalQueue: OfflineQueue | null = null;

/**
 * 获取离线队列实例
 */
export async function getOfflineQueue(): Promise<OfflineQueue> {
  if (!globalQueue) {
    globalQueue = new OfflineQueue();
    await globalQueue.init();
  }
  return globalQueue;
}

/**
 * 后台同步服务
 *
 * 在 Service Worker 中使用，监听 sync 事件并同步队列中的请求
 */
export async function syncPendingRequests(supabaseUrl: string, supabaseAnonKey: string): Promise<SyncResult[]> {
  const queue = await getOfflineQueue();
  const requests = await queue.getPendingRequests();

  if (requests.length === 0) {
    return [{ success: true, requestId: 'none' }];
  }

  const results: SyncResult[] = [];
  const successfullySynced: string[] = [];

  for (const request of requests) {
    try {
      // 使用 fetch 发送请求
      const response = await fetch(`${supabaseUrl}${request.url}`, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          ...request.headers,
        },
        body: request.body,
      });

      if (response.ok) {
        successfullySynced.push(request.id);
        await queue.deleteRequest(request.id);
        results.push({
          success: true,
          requestId: request.id,
        });
      } else {
        // 更新重试次数
        const newRetryCount = (request.retryCount || 0) + 1;
        if (newRetryCount > 3) {
          // 超过最大重试次数，删除请求
          await queue.deleteRequest(request.id);
          results.push({
            success: false,
            requestId: request.id,
            error: `同步失败: ${response.status}`,
          });
        } else {
          await queue.updateRetryCount(request.id, newRetryCount);
          results.push({
            success: false,
            requestId: request.id,
            error: `同步失败: ${response.status}, 将稍后重试`,
          });
        }
      }
    } catch (error) {
      const newRetryCount = (request.retryCount || 0) + 1;
      if (newRetryCount > 3) {
        await queue.deleteRequest(request.id);
        results.push({
          success: false,
          requestId: request.id,
          error: `网络错误: ${error}`,
        });
      } else {
        await queue.updateRetryCount(request.id, newRetryCount);
        results.push({
          success: false,
          requestId: request.id,
          error: `网络错误，将稍后重试`,
        });
      }
    }
  }

  logger.info('后台同步完成', {
    total: requests.length,
    succeeded: successfullySynced.length,
    failed: results.filter(r => !r.success).length,
  });

  return results;
}
