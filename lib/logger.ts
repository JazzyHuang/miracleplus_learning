/**
 * 结构化日志系统
 * 简化版本，避免使用 pino 的复杂功能
 * 专门为 Next.js Server Actions 和 RSC 环境优化
 */

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志上下文接口
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

/**
 * 获取当前日志级别
 */
function getLogLevel(): LogLevel {
  if (process.env.NODE_ENV === 'production') {
    return (process.env.LOG_LEVEL as LogLevel) || 'info';
  }
  return 'debug';
}

/**
 * 格式化错误对象
 */
function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  if (error && typeof error === 'object') {
    const msg = 'message' in error
      ? String((error as Record<string, unknown>).message)
      : JSON.stringify(error);
    return { message: msg };
  }
  return { message: String(error) };
}

/**
 * 格式化上下文为字符串
 */
function formatContext(context: Record<string, unknown>): string {
  const entries = Object.entries(context).map(([key, value]) => {
    if (value instanceof Error) {
      return `${key}=${JSON.stringify(formatError(value))}`;
    }
    return `${key}=${JSON.stringify(value)}`;
  });
  return entries.join(' ');
}

/**
 * 获取时间戳
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 带上下文的 Logger 类
 */
export class Logger {
  private context: LogContext = {};

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * 创建带有新上下文的子 logger
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  /**
   * 设置上下文
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 获取当前上下文
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * 记录调试信息
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    const level = getLogLevel();
    if (level !== 'debug') return;

    const mergedContext = { ...this.context, ...meta };
    const contextStr = formatContext(mergedContext);
    console.debug(`[${getTimestamp()}] DEBUG ${message}`, contextStr);
  }

  /**
   * 记录一般信息
   */
  info(message: string, meta?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...meta };
    const contextStr = formatContext(mergedContext);
    console.info(`[${getTimestamp()}] INFO ${message}`, contextStr);
  }

  /**
   * 记录警告信息
   */
  warn(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const extras: Record<string, unknown> = { ...meta };
    if (error) {
      extras.err = formatError(error);
    }
    const mergedContext = { ...this.context, ...extras };
    const contextStr = formatContext(mergedContext);
    console.warn(`[${getTimestamp()}] WARN ${message}`, contextStr);
  }

  /**
   * 记录错误信息
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorObj = error instanceof Error
      ? error
      : (error && typeof error === 'object' && 'message' in error)
        ? Object.assign(new Error((error as { message: string }).message), error)
        : new Error(String(error));
    const mergedContext = {
      ...this.context,
      ...meta,
      err: formatError(errorObj),
    };
    const contextStr = formatContext(mergedContext);
    console.error(`[${getTimestamp()}] ERROR ${message}`, contextStr);
  }

  /**
   * 记录 HTTP 请求
   */
  logRequest(method: string, path: string, meta?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...meta, method, path, type: 'http_request' };
    this.info(`HTTP ${method} ${path}`, mergedContext);
  }

  /**
   * 记录 HTTP 响应
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
    const mergedContext = { ...this.context, ...meta, method, path, statusCode, duration, type: 'http_response' };
    this.info(`HTTP ${method} ${path} - ${statusCode} (${duration}ms)`, mergedContext);
  }

  /**
   * 记录数据库查询
   */
  logQuery(table: string, operation: string, duration: number, meta?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...meta, table, operation, duration, type: 'database_query' };
    this.debug(`DB ${operation} ${table} (${duration}ms)`, mergedContext);
  }

  /**
   * 记录性能指标
   */
  logMetric(name: string, value: number, unit: string = 'ms', meta?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...meta, metric: name, value, unit, type: 'metric' };
    this.info(`Metric: ${name} = ${value}${unit}`, mergedContext);
  }

  /**
   * 记录安全事件
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: Record<string, unknown>): void {
    const mergedContext = { ...this.context, ...meta, securityEvent: event, severity, type: 'security' };
    this.warn(`Security Event: ${event} (${severity})`, undefined, mergedContext);
  }
}

/**
 * 默认 logger 实例
 */
export const logger = new Logger();

/**
 * 创建带有请求 ID 的 logger
 */
export function createRequestLogger(requestId: string): Logger {
  return logger.child({ requestId });
}

/**
 * 创建带有用户 ID 的 logger
 */
export function createUserLogger(userId: string): Logger {
  return logger.child({ userId });
}

/**
 * 性能计时器
 */
export class Timer {
  private start: number;
  private logger: Logger;
  private label: string;

  constructor(logger: Logger, label: string) {
    this.start = Date.now();
    this.logger = logger;
    this.label = label;
  }

  /**
   * 结束计时并记录
   */
  end(meta?: Record<string, unknown>): number {
    const duration = Date.now() - this.start;
    this.logger.debug(`${this.label} 完成`, { ...meta, duration });
    return duration;
  }

  /**
   * 结束计时并作为性能指标记录
   */
  endAsMetric(meta?: Record<string, unknown>): number {
    const duration = Date.now() - this.start;
    this.logger.logMetric(this.label, duration, 'ms', meta);
    return duration;
  }
}

/**
 * 创建计时器
 */
export function createTimer(logger: Logger, label: string): Timer {
  return new Timer(logger, label);
}

// 重新导出默认 logger 以兼容现有代码
export default logger;
