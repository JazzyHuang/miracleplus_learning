/**
 * 统一的 Server Action 返回类型
 *
 * 所有 Server Action 应返回此类型，确保客户端处理一致。
 * 向后兼容：现有 action 可逐步迁移。
 */

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  /** 是否被限流 */
  rateLimited?: boolean;
  /** 限流重试等待秒数 */
  retryAfter?: number;
}

/** 成功结果工厂 */
export function ok<T>(data?: T): ActionResult<T> {
  return data !== undefined ? { success: true, data } : { success: true } as ActionResult<T>;
}

/** 失败结果工厂 */
export function fail<T = void>(error: string, extra?: Partial<ActionResult<T>>): ActionResult<T> {
  return { success: false, error, ...extra };
}

/** 限流结果工厂 */
export function rateLimited<T = void>(retryAfter: number): ActionResult<T> {
  return { success: false, error: '操作过于频繁，请稍后再试', rateLimited: true, retryAfter };
}
