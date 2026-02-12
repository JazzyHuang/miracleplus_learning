/**
 * 分布式速率限制器
 * 使用 Supabase 数据表实现跨实例的速率限制
 * 适用于 serverless 环境和多实例部署
 *
 * 实现策略：Token Bucket 算法
 * - 每个 key 有一个 token bucket，存储在数据库中
 * - 每个请求消耗 tokens，tokens 自动恢复
 * - 当 tokens 不足时拒绝请求
 *
 * 数据库表结构 (在迁移文件中创建):
 * CREATE TABLE miracle_learning_20260209_rate_limit_entries (
 *   key TEXT PRIMARY KEY,
 *   tokens INTEGER NOT NULL,
 *   last_update TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * 索引: CREATE INDEX ml_idx_rate_limit_last_update ON miracle_learning_20260209_rate_limit_entries(last_update);
 */

import { createClient } from '@/lib/supabase/server';
import { DB, RPC } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 时间窗口内允许的最大请求数 */
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * 最小时间窗口（1秒）
 */
const MIN_WINDOW_MS = 1000;

/**
 * 最大时间窗口（24小时）
 */
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Token 恢复速率（tokens/毫秒）= maxRequests / windowMs
 * 使用浮点数计算确保精度
 */
function getRefillRate(config: RateLimitConfig): number {
  return config.maxRequests / config.windowMs;
}

/**
 * 内存缓存层：减少数据库查询
 *
 * 策略：缓存最近的限流结果，5 秒内命中且有剩余 token 时直接返回。
 * 每个条目最多本地消耗 3 次后强制回源 DB，防止偏差过大。
 * 缓存显示已限流时直接回源（用户可能已等待足够时间）。
 */
interface CachedRateLimit {
  result: RateLimitResult;
  timestamp: number;
  localConsumed: number;
}

const resultCache = new Map<string, CachedRateLimit>();
const CACHE_TTL_MS = 5000;
const MAX_LOCAL_CONSUME = 3;
const CACHE_CLEANUP_INTERVAL_MS = 60000;
let lastCacheCleanup = Date.now();

function cleanupResultCache() {
  const now = Date.now();
  if (now - lastCacheCleanup < CACHE_CLEANUP_INTERVAL_MS) return;
  lastCacheCleanup = now;
  for (const [key, entry] of resultCache) {
    if (now - entry.timestamp > CACHE_TTL_MS * 2) {
      resultCache.delete(key);
    }
  }
}

/**
 * 验证速率限制配置
 */
function validateConfig(config: RateLimitConfig): void {
  if (typeof config.windowMs !== 'number' || config.windowMs < MIN_WINDOW_MS) {
    throw new Error(`windowMs 必须至少为 ${MIN_WINDOW_MS}ms`);
  }
  if (config.windowMs > MAX_WINDOW_MS) {
    throw new Error(`windowMs 不能超过 ${MAX_WINDOW_MS}ms（24小时）`);
  }
  if (typeof config.maxRequests !== 'number' || config.maxRequests <= 0) {
    throw new Error('maxRequests 必须大于 0');
  }
  if (!Number.isInteger(config.maxRequests)) {
    throw new Error('maxRequests 必须是整数');
  }
}

/**
 * 分布式速率限制检查
 *
 * 使用 PostgreSQL 的行级锁和乐观并发控制实现
 * 降级策略：如果数据库不可用，允许请求通过（fail-open）
 *
 * @param key 限制键（通常是 IP 或用户 ID）
 * @param config 限制配置
 * @returns 速率限制结果
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // 验证配置
  validateConfig(config);

  const now = Date.now();
  const refillRate = getRefillRate(config);

  // 内存缓存快速路径：命中且有剩余 token 时跳过 DB
  cleanupResultCache();
  const cached = resultCache.get(key);
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    if (cached.result.success && cached.result.remaining > 0 && cached.localConsumed < MAX_LOCAL_CONSUME) {
      cached.localConsumed++;
      return {
        ...cached.result,
        remaining: Math.max(0, cached.result.remaining - cached.localConsumed),
      };
    }
    // 已限流或 token 耗尽 → 回源 DB（用户可能已等待足够时间）
  }

  try {
    const supabase = await createClient();

    // 使用 RPC 函数确保原子性（避免 TOCTOU 竞态条件）
    const { data, error } = await supabase.rpc(RPC.check_rate_limit, {
      p_key: key,
      p_max_tokens: config.maxRequests,
      p_refill_rate: refillRate,
      p_window_ms: config.windowMs,
      p_current_time: new Date(now).toISOString(),
    });

    if (error) {
      // 如果 RPC 函数不存在（旧版本），降级到内存实现
      if (error.code === '42883') { // function does not exist
        logger.warn('分布式限流 RPC 函数不存在，降级到内存限流');
        return fallbackMemoryCheck(key, config, now);
      }
      // 数据库错误时降级：允许请求通过
      logger.error('速率限制检查失败，降级为允许通过', new Error(error.message || 'Unknown error'), { key, code: error.code });
      return {
        success: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }

    // RPC 返回格式: { allowed: boolean, remaining: number, reset_at: string }
    const result = data as { allowed: boolean; remaining: number; reset_at: string };
    const resetTime = new Date(result.reset_at).getTime();

    const rateLimitResult: RateLimitResult = {
      success: result.allowed,
      remaining: result.remaining,
      resetTime,
      retryAfter: result.allowed ? undefined : Math.max(0, Math.ceil((resetTime - now) / 1000)),
    };

    // 缓存成功的 DB 结果
    resultCache.set(key, { result: rateLimitResult, timestamp: now, localConsumed: 0 });

    return rateLimitResult;
  } catch (err) {
    // 捕获所有异常，降级到内存实现
    logger.error('速率限制异常，降级到内存限流', err instanceof Error ? err : new Error(String(err)), { key });
    return fallbackMemoryCheck(key, config, now);
  }
}

/**
 * 内存降级实现
 * 当数据库不可用时使用
 *
 * 注意：这是一个简单的内存 Map 实现，不适用于生产环境
 * 仅作为降级策略使用
 */
interface MemoryEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryEntry>();
const MAX_MEMORY_STORE_SIZE = 10000;
let lastMemoryCleanup = Date.now();
const MEMORY_CLEANUP_INTERVAL_MS = 60000;

function cleanupMemoryStore(now: number) {
  if (now - lastMemoryCleanup < MEMORY_CLEANUP_INTERVAL_MS) return;
  lastMemoryCleanup = now;
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
  // Hard cap: evict oldest entries if still too large
  if (memoryStore.size > MAX_MEMORY_STORE_SIZE) {
    const entries = [...memoryStore.entries()].sort((a, b) => a[1].resetTime - b[1].resetTime);
    const toDelete = entries.slice(0, memoryStore.size - MAX_MEMORY_STORE_SIZE);
    for (const [key] of toDelete) {
      memoryStore.delete(key);
    }
  }
}

function fallbackMemoryCheck(key: string, config: RateLimitConfig, now: number): RateLimitResult {
  cleanupMemoryStore(now);
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    memoryStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * 创建速率限制响应
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: '请求过于频繁，请稍后再试',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetTime),
        ...(result.retryAfter && { 'Retry-After': String(result.retryAfter) }),
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * 获取请求 IP
 *
 * 信任假设：此函数信任 x-forwarded-for 和 x-real-ip 头部。
 * 在生产环境中，这些头部应由受信任的反向代理设置。
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * 重置特定键的限制（用于管理）
 */
export async function resetRateLimit(key: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from(DB.rate_limit_entries)
      .delete()
      .eq('key', key);

    if (error) {
      logger.error('重置速率限制失败', new Error(error.message || 'Unknown error'), { key });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('重置速率限制异常', err instanceof Error ? err : new Error(String(err)), { key });
    return false;
  }
}

/**
 * 获取速率限制统计信息（用于监控）
 */
export async function getRateLimitStats(): Promise<{
  totalEntries: number;
  activeEntries: number;
}> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase.from(DB.rate_limit_entries)
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error('获取速率限制统计失败', new Error(error.message || 'Unknown error'));
      return { totalEntries: 0, activeEntries: 0 };
    }

    return {
      totalEntries: count || 0,
      activeEntries: count || 0,
    };
  } catch (err) {
    logger.error('获取速率限制统计异常', err instanceof Error ? err : new Error(String(err)));
    return { totalEntries: 0, activeEntries: 0 };
  }
}

// 预定义的速率限制配置
export const RATE_LIMITS = {
  // 通用 API: 每分钟 60 次
  api: { windowMs: 60 * 1000, maxRequests: 60 },
  // AI 生成: 每分钟 10 次
  aiGenerate: { windowMs: 60 * 1000, maxRequests: 10 },
  // 登录尝试: 每 15 分钟 10 次
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  // 注册: 每 15 分钟 10 次
  register: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  // 图片上传: 每分钟 10 次
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
  // 管理员导出: 每分钟 10 次
  adminExport: { windowMs: 60 * 1000, maxRequests: 10 },
  // 修改密码: 每 15 分钟 3 次
  passwordChange: { windowMs: 15 * 60 * 1000, maxRequests: 3 },
  // 账户注销: 每小时 1 次
  accountDeletion: { windowMs: 60 * 60 * 1000, maxRequests: 1 },
  // 数据导出: 每天 1 次
  dataExport: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 1 },
  // 管理端操作: 每分钟 30 次
  adminAction: { windowMs: 60 * 1000, maxRequests: 30 },
} as const;
