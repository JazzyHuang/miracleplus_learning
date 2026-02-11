/**
 * 熔断器模式实现
 *
 * 防止级联故障，当外部服务失败时快速失败并降级
 *
 * 状态转换：
 * CLOSED (正常) → OPEN (故障) → HALF_OPEN (试探) → CLOSED
 */

import { logger } from '@/lib/logger';

/**
 * 熔断器状态
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // 正常状态，请求正常通过
  OPEN = 'OPEN',           // 熔断状态，请求快速失败
  HALF_OPEN = 'HALF_OPEN', // 半开状态，试探性允许少量请求
}

/**
 * 熔断器配置
 */
export interface CircuitBreakerConfig {
  // 在 OPEN 状态下，经过多少毫秒后转为 HALF_OPEN
  resetTimeout: number;
  // 在 HALF_OPEN 状态下，允许多少个请求通过来测试服务恢复
  halfOpenMaxCalls: number;
  // 失败阈值：失败多少次后触发熔断
  failureThreshold: number;
  // 成功阈值：成功多少次后认为服务已恢复
  successThreshold: number;
  // 时间窗口（毫秒）：在此时间内统计失败次数
  rollingTimeWindow: number;
  // 降级处理函数
  fallback?: () => unknown;
}

/**
 * 熔断器结果
 */
export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromFallback?: boolean;
  state: CircuitBreakerState;
}

/**
 * 熔断器实现
 */
export class CircuitBreaker<T = unknown> {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenCallCount = 0;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  /**
   * 执行带熔断保护的函数
   */
  async execute(fn: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    const now = Date.now();

    // 检查是否应该从 OPEN 转为 HALF_OPEN
    if (this.state === CircuitBreakerState.OPEN) {
      if (now - this.lastFailureTime >= this.config.resetTimeout) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        logger.info(`熔断器 [${this.name}] 转为 HALF_OPEN 状态`);
      } else {
        // 仍然在 OPEN 状态，使用降级处理
        return this.executeFallback(new Error('Circuit breaker is OPEN'));
      }
    }

    // 在 HALF_OPEN 状态下，限制请求次数
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        return this.executeFallback(new Error('Half-open max calls exceeded'));
      }
      this.halfOpenCallCount++;
    }

    try {
      const result = await fn();
      this.onSuccess(now);
      return { success: true, data: result, state: this.state };
    } catch (error) {
      this.onFailure(now, error as Error);
      return this.executeFallback(error as Error);
    }
  }

  /**
   * 成功处理
   */
  private onSuccess(_now: number): void {
    this.successCount++;

    // 如果在 HALF_OPEN 状态下成功次数达到阈值，转为 CLOSED
    if (
      this.state === CircuitBreakerState.HALF_OPEN &&
      this.successCount >= this.config.successThreshold
    ) {
      this.transitionTo(CircuitBreakerState.CLOSED);
      logger.info(`熔断器 [${this.name}] 恢复为 CLOSED 状态`);
      this.resetCounts();
    }

    // 在 CLOSED 状态下，成功会重置失败计数
    if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount = 0;
    }
  }

  /**
   * 失败处理
   */
  private onFailure(now: number, _error: Error): void {
    this.failureCount++;

    // 检查是否应该触发熔断
    if (this.failureCount >= this.config.failureThreshold) {
      this.lastFailureTime = now;
      this.transitionTo(CircuitBreakerState.OPEN);
      logger.warn(`熔断器 [${this.name}] 触发熔断，转为 OPEN 状态`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
    }
  }

  /**
   * 转换状态
   */
  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    // 状态转换时的额外处理
    if (newState === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCallCount = 0;
    } else if (newState === CircuitBreakerState.CLOSED) {
      this.resetCounts();
    }

    logger.info(`熔断器 [${this.name}] 状态转换: ${oldState} → ${newState}`);
  }

  /**
   * 重置计数器
   */
  private resetCounts(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCallCount = 0;
  }

  /**
   * 执行降级处理
   */
  private executeFallback(error: Error): CircuitBreakerResult<T> {
    if (this.config.fallback) {
      try {
        const fallbackResult = this.config.fallback();
        return {
          success: true,
          data: fallbackResult as T,
          fromFallback: true,
          state: this.state,
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: fallbackError as Error,
          fromFallback: true,
          state: this.state,
        };
      }
    }

    return {
      success: false,
      error,
      state: this.state,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 重置熔断器（用于手动恢复）
   */
  reset(): void {
    this.transitionTo(CircuitBreakerState.CLOSED);
    logger.info(`熔断器 [${this.name}] 手动重置为 CLOSED 状态`);
  }
}

/**
 * 熔断器管理器
 * 管理多个熔断器实例
 */
export class CircuitBreakerManager {
  private readonly breakers = new Map<string, CircuitBreaker>();

  /**
   * 获取或创建熔断器
   */
  getBreaker<T>(name: string, config?: CircuitBreakerConfig): CircuitBreaker<T> {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        resetTimeout: 60000, // 1 分钟
        halfOpenMaxCalls: 3,
        failureThreshold: 5,
        successThreshold: 2,
        rollingTimeWindow: 10000, // 10 秒
      };
      this.breakers.set(name, new CircuitBreaker<T>(name, { ...defaultConfig, ...config }));
    }
    return this.breakers.get(name) as CircuitBreaker<T>;
  }

  /**
   * 重置所有熔断器
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * 获取所有熔断器状态
   */
  getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      states[name] = breaker.getState();
    }
    return states;
  }
}

// 全局熔断器管理器实例
export const circuitBreakerManager = new CircuitBreakerManager();
