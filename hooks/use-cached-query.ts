'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 轻量级客户端数据缓存 Hook
 * 
 * 功能：
 * - 基于 Map 的内存缓存，支持 TTL 过期
 * - 请求去重（同一 key 不会发起并发请求）
 * - 缓存命中时立即返回数据，后台静默更新（stale-while-revalidate）
 * - 组件卸载时安全取消更新
 * 
 * 性能提升：
 * - 游戏化组件（PointCard、MiniLeaderboard）在页面间导航时瞬间显示缓存数据
 * - 减少不必要的 Supabase 请求
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 全局缓存存储（跨组件共享）
const globalCache = new Map<string, CacheEntry<unknown>>();
// 进行中的请求（防止并发重复请求）
const pendingRequests = new Map<string, Promise<unknown>>();

// 缓存治理：最大条目数限制，防止内存无限增长
const MAX_CACHE_SIZE = 100;
// 全局 TTL 上限：5 分钟（即使单个 hook 设置更长，也会被淘汰）
const MAX_TTL = 5 * 60 * 1000;

/** 淘汰过期和最旧的缓存条目 */
function evictOldEntries() {
  const now = Date.now();

  // 先淘汰超过全局 TTL 上限的条目
  for (const [key, entry] of globalCache) {
    if (now - entry.timestamp > MAX_TTL) {
      globalCache.delete(key);
    }
  }

  // 再按大小淘汰最旧的
  if (globalCache.size <= MAX_CACHE_SIZE) return;
  const entries = [...globalCache.entries()].sort(
    (a, b) => a[1].timestamp - b[1].timestamp
  );
  const toRemove = entries.slice(0, globalCache.size - MAX_CACHE_SIZE);
  for (const [key] of toRemove) {
    globalCache.delete(key);
  }
}

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    /** 缓存 TTL（毫秒），默认 30 秒 */
    ttl?: number;
    /** 是否启用 stale-while-revalidate 模式，默认 true */
    staleWhileRevalidate?: boolean;
    /** 是否在 key 变化时重新获取，默认 true */
    enabled?: boolean;
  }
) {
  const { ttl = 30000, staleWhileRevalidate = true, enabled = true } = options ?? {};
  
  // 从缓存初始化状态
  const [data, setData] = useState<T | null>(() => {
    const cached = globalCache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  
  // 防止组件卸载后更新状态
  const mountedRef = useRef(true);
  // 使用 ref 存储 fetcher，避免内联函数导致无限循环
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // 检查缓存
    const cached = globalCache.get(key) as CacheEntry<T> | undefined;
    const isFresh = cached && Date.now() - cached.timestamp < ttl;

    if (isFresh) {
      if (mountedRef.current) {
        setData(cached.data);
        setLoading(false);
      }
      return;
    }

    // 如果有缓存但过期了，先显示旧数据（stale-while-revalidate）
    if (cached && staleWhileRevalidate) {
      if (mountedRef.current) {
        setData(cached.data);
        setLoading(false);
      }
    }

    // 检查是否有进行中的相同请求（去重）
    let promise = pendingRequests.get(key) as Promise<T> | undefined;
    if (!promise) {
      // 使用 fetcherRef.current 而非 fetcher，避免依赖数组包含 fetcher
      promise = Promise.resolve().then(() => fetcherRef.current());
      pendingRequests.set(key, promise);
      // 确保 promise 结束后从 pendingRequests 中移除，防止内存泄漏
      promise.finally(() => { pendingRequests.delete(key); });
    }

    try {
      const result = await promise;
      
      // 更新缓存并淘汰旧条目
      globalCache.set(key, { data: result, timestamp: Date.now() });
      evictOldEntries();
      
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Fetch failed'));
      }
    } finally {
      pendingRequests.delete(key);
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [key, ttl, staleWhileRevalidate, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    // 清除缓存和旧错误状态，重新获取
    globalCache.delete(key);
    setError(null);
    setLoading(true);
    fetchData();
  }, [key, fetchData]);

  const isStale = data !== null && (() => {
    const cached = globalCache.get(key) as CacheEntry<T> | undefined;
    return !cached || Date.now() - cached.timestamp >= ttl;
  })();

  return { data, loading, error, isStale, refetch };
}

/**
 * 用服务端数据预填充缓存
 * 仅在缓存为空时写入，避免覆盖客户端更新后的新数据
 */
export function seedCache<T>(key: string, data: T) {
  if (!globalCache.has(key)) {
    globalCache.set(key, { data, timestamp: Date.now() });
  }
}

/**
 * 手动清除指定 key 的缓存
 */
export function invalidateCache(key: string) {
  globalCache.delete(key);
}

/**
 * 清除所有匹配前缀的缓存
 */
export function invalidateCacheByPrefix(prefix: string) {
  for (const key of globalCache.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.delete(key);
    }
  }
}
