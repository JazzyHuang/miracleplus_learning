/**
 * 简单的内存速率限制器
 * 适用于中小规模应用，生产环境建议使用 Redis 或 Upstash
 * 
 * 注意：在 serverless 环境下，多实例不共享内存，限制可能不准确
 * 生产环境建议使用分布式存储（如 Upstash Redis）
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 内存存储（注意：在 serverless 环境下可能不持久）
const rateLimitStore = new Map<string, RateLimitEntry>();

/** 存储大小限制，防止内存泄漏 */
const MAX_STORE_SIZE = 10000;

/** 最小时间窗口（1秒） */
const MIN_WINDOW_MS = 1000;

/** 最大时间窗口（24小时） */
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

interface RateLimitConfig {
  /** 时间窗口（毫秒），范围 1000-86400000 */
  windowMs: number;
  /** 时间窗口内允许的最大请求数，必须大于 0 */
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
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
 * 清理过期条目
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * 强制清理存储（当超过大小限制时）
 * 删除最旧的条目
 */
function forceCleanup(): void {
  // 先尝试清理过期条目
  cleanupExpiredEntries();
  
  // 如果仍然超过限制，删除最旧的条目
  if (rateLimitStore.size >= MAX_STORE_SIZE) {
    const entriesToDelete = Math.floor(MAX_STORE_SIZE * 0.2); // 删除 20%
    const sortedEntries = Array.from(rateLimitStore.entries())
      .sort((a, b) => a[1].resetTime - b[1].resetTime);
    
    for (let i = 0; i < entriesToDelete && i < sortedEntries.length; i++) {
      rateLimitStore.delete(sortedEntries[i][0]);
    }
  }
}

/**
 * 检查速率限制
 * @param key 限制键（通常是 IP 或用户 ID）
 * @param config 限制配置
 * @throws 如果配置无效
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  // 验证配置
  validateConfig(config);

  // 检查存储大小限制
  if (rateLimitStore.size >= MAX_STORE_SIZE) {
    forceCleanup();
  }

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // 如果没有记录或已过期，创建新记录
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // 检查是否超限
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // 增加计数
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * 获取当前存储状态（用于监控）
 */
export function getRateLimitStats(): { size: number; maxSize: number } {
  return {
    size: rateLimitStore.size,
    maxSize: MAX_STORE_SIZE,
  };
}

/**
 * 重置特定键的限制（用于管理）
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * 创建速率限制中间件响应
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
      },
    }
  );
}

/**
 * 获取请求 IP
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// 预定义的速率限制配置
export const RATE_LIMITS = {
  // 通用 API: 每分钟 60 次
  api: { windowMs: 60 * 1000, maxRequests: 60 },
  // AI 生成: 每分钟 10 次
  aiGenerate: { windowMs: 60 * 1000, maxRequests: 10 },
  // 登录尝试: 每 15 分钟 5 次
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  // 注册: 每小时 3 次
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  // 图片上传: 每分钟 10 次
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
} as const;

// 定期清理过期记录（每 5 分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
