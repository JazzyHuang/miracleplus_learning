/**
 * 错误追踪抽象层
 *
 * 初期使用 console + 结构化日志收集错误
 * 后期可切换到 Sentry 或其他服务，只需修改此文件
 *
 * 环境变量: NEXT_PUBLIC_ERROR_TRACKING_DSN (可选)
 */

interface ErrorContext {
  /** 错误来源组件/模块 */
  source?: string;
  /** 用户 ID */
  userId?: string;
  /** 当前路径 */
  path?: string;
  /** 错误摘要 (Next.js digest) */
  digest?: string;
  /** 额外元数据 */
  [key: string]: unknown;
}

let initialized = false;

/**
 * 初始化错误追踪（客户端）
 * 在 Providers 中调用一次
 */
export function initErrorTracking(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // 捕获未处理的 Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    captureException(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { source: 'unhandledrejection' }
    );
  });

  // 捕获全局错误
  window.addEventListener('error', (event) => {
    if (event.error) {
      captureException(event.error, {
        source: 'window.onerror',
        path: event.filename,
      });
    }
  });
}

/**
 * 上报错误
 */
export function captureException(error: Error, context?: ErrorContext): void {
  const dsn = typeof window !== 'undefined'
    ? (window as unknown as Record<string, unknown>).__ERROR_TRACKING_DSN as string | undefined
    : process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN;

  // 结构化错误信息
  const payload = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  };

  // 始终输出到 console（开发 + 生产）
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorTracking]', payload);
    return;
  }

  // 生产环境：如果配置了 DSN，发送到远程服务
  if (dsn) {
    // 使用 sendBeacon 确保页面卸载时也能发送
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(dsn, blob);
    } else {
      fetch(dsn, { method: 'POST', body: blob, keepalive: true }).catch(() => {
        // 静默失败 — 错误追踪本身不应抛出错误
      });
    }
  }

  // 生产环境也输出到 console（服务端日志收集）
  console.error('[ErrorTracking]', JSON.stringify(payload));
}

/**
 * 上报消息（非错误级别）
 */
export function captureMessage(message: string, context?: ErrorContext): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[ErrorTracking]', message, context);
    return;
  }
  console.warn('[ErrorTracking]', JSON.stringify({ message, ...context }));
}
