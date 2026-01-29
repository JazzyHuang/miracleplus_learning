/**
 * 统一 API 客户端
 * 提供 HTTP 状态检查、错误处理、请求取消和类型安全的请求方法
 */

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** 错误是否可重试（服务端错误可重试，客户端错误不可） */
  retryable?: boolean;
  /** HTTP 状态码 */
  statusCode?: number;
}

/** API 请求配置 */
interface RequestConfig extends Omit<RequestInit, 'body' | 'signal'> {
  body?: Record<string, unknown> | FormData;
  /** AbortController 信号，用于取消请求 */
  signal?: AbortSignal;
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;
}

/**
 * 创建带超时的 AbortController
 */
function createTimeoutController(
  timeoutMs: number,
  existingSignal?: AbortSignal
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('请求超时', 'TimeoutError'));
  }, timeoutMs);

  // 如果提供了外部信号，监听它的 abort 事件
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort(existingSignal.reason);
    } else {
      existingSignal.addEventListener('abort', () => {
        controller.abort(existingSignal.reason);
      });
    }
  }

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * 判断 HTTP 状态码是否为服务端错误（可重试）
 */
function isServerError(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

/**
 * 发起 API 请求
 * 自动处理 JSON 序列化、HTTP 状态检查、超时和错误处理
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options?: RequestConfig
): Promise<ApiResponse<T>> {
  const { body, signal, timeout = 30000, ...rest } = options || {};

  // 创建带超时的 controller
  const { controller, cleanup } = createTimeoutController(timeout, signal);

  try {
    const config: RequestInit = {
      ...rest,
      signal: controller.signal,
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...rest.headers,
      },
    };

    if (body) {
      config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const response = await fetch(endpoint, config);
    cleanup();

    // 尝试解析 JSON 响应
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // 检查 HTTP 状态码
    if (!response.ok) {
      const statusCode = response.status;
      const errorMessage = 
        typeof data === 'object' && data !== null && 'error' in data
          ? String((data as Record<string, unknown>).error)
          : `请求失败: ${statusCode} ${response.statusText}`;
      
      return {
        success: false,
        error: errorMessage,
        statusCode,
        // 客户端错误（4xx）不可重试，服务端错误（5xx）可重试
        retryable: isServerError(statusCode),
      };
    }

    return {
      success: true,
      data: data as T,
      statusCode: response.status,
    };
  } catch (error) {
    cleanup();

    // 处理请求取消
    if (error instanceof DOMException) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        const isTimeout = error.message === '请求超时' || error.name === 'TimeoutError';
        return {
          success: false,
          error: isTimeout ? '请求超时，请稍后重试' : '请求已取消',
          retryable: isTimeout, // 超时可重试，主动取消不可
        };
      }
    }

    // 网络错误或其他异常
    const errorMessage = error instanceof Error 
      ? error.message 
      : '网络请求失败，请检查网络连接';

    console.error('API Request Error:', error);

    return {
      success: false,
      error: errorMessage,
      retryable: true, // 网络错误通常可重试
    };
  }
}

/**
 * GET 请求快捷方法
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  options?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST 请求快捷方法
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  body?: Record<string, unknown>,
  options?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * PUT 请求快捷方法
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  body?: Record<string, unknown>,
  options?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * DELETE 请求快捷方法
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  options?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * 刷新缓存
 * 在数据修改后调用以刷新服务端缓存
 */
export async function revalidateCache(tag: string): Promise<void> {
  try {
    const response = await apiPost('/api/revalidate', { tag });
    if (!response.success) {
      console.warn('缓存刷新失败:', response.error);
    }
  } catch (error) {
    console.error('缓存刷新失败:', error);
  }
}

/** 重试配置 */
interface RetryConfig {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 基础延迟时间（毫秒），默认 1000 */
  baseDelay?: number;
  /** 最大延迟时间（毫秒），默认 10000 */
  maxDelay?: number;
  /** 是否使用指数退避，默认 true */
  exponentialBackoff?: boolean;
}

/**
 * 计算重试延迟时间（带抖动的指数退避）
 */
function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  useExponential: boolean
): number {
  if (!useExponential) {
    return baseDelay;
  }
  // 指数退避：delay = baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // 添加随机抖动（±25%）避免雷群效应
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * 带重试的请求
 * 适用于可能暂时失败的请求，使用指数退避策略
 */
export async function apiRequestWithRetry<T = unknown>(
  endpoint: string,
  options?: RequestConfig,
  retryConfig: RetryConfig = {}
): Promise<ApiResponse<T>> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    exponentialBackoff = true,
  } = retryConfig;

  let lastResult: ApiResponse<T> | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await apiRequest<T>(endpoint, options);
    lastResult = result;
    
    if (result.success) {
      return result;
    }

    // 如果明确标记为不可重试（如客户端错误 4xx），立即返回
    if (result.retryable === false) {
      return result;
    }

    // 等待后重试（最后一次失败不需要等待）
    if (attempt < maxRetries - 1) {
      const delay = calculateRetryDelay(attempt, baseDelay, maxDelay, exponentialBackoff);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult || {
    success: false,
    error: '请求失败，请稍后重试',
    retryable: true,
  };
}

/**
 * 创建可取消的请求
 * 返回请求 Promise 和取消函数
 */
export function createCancelableRequest<T = unknown>(
  endpoint: string,
  options?: Omit<RequestConfig, 'signal'>
): { promise: Promise<ApiResponse<T>>; cancel: () => void } {
  const controller = new AbortController();
  
  return {
    promise: apiRequest<T>(endpoint, { ...options, signal: controller.signal }),
    cancel: () => controller.abort(),
  };
}
