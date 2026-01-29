/**
 * AI 服务模块
 * 
 * ## 架构说明
 * 
 * 此模块提供 AI API 调用和问题验证功能。
 * 
 * **注意**：虽然此模块没有 `next/headers` 依赖，但它使用服务端环境变量，
 * 应该只在 API Routes 或 Server Actions 中使用。
 * 
 * ### 导出
 * - `callGemini` - 调用 AI API（带重试和超时）
 * - `validateQuestion`, `validateQuestions` - 验证 AI 生成的问题
 * - `AIError` - AI 调用错误类
 * - `ChatMessage`, `GeminiOptions` - 类型定义
 * 
 * @example
 * // API Route
 * import { callGemini, validateQuestions, AIError } from '@/lib/ai';
 */

import type { QuestionType, AIGeneratedQuestion, QuestionOption } from '@/types/database';

const NEW_API_BASE_URL = process.env.NEW_API_BASE_URL || 'https://api.newapi.pro/v1';
const NEW_API_KEY = process.env.NEW_API_KEY;

/** 默认超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 30000;

/** 默认重试次数 */
const DEFAULT_RETRIES = 3;

/** 速率限制重试的基础等待时间（毫秒） */
const RATE_LIMIT_BASE_DELAY = 1000;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** AI 调用选项 */
export interface GeminiOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** AbortSignal 用于取消请求 */
  signal?: AbortSignal;
}

/** AI 调用错误类型 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONFIG_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'PARSE_ERROR' | 'CANCELLED',
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * 调用 Gemini API（带重试和超时）
 * @throws {AIError} 调用失败时抛出
 */
export async function callGemini(
  messages: ChatMessage[],
  options: GeminiOptions = {}
): Promise<string> {
  if (!NEW_API_KEY) {
    throw new AIError('NEW_API_KEY 未配置', 'CONFIG_ERROR', undefined, false);
  }

  const {
    model = 'gemini-2.0-flash',
    temperature = 0.7,
    maxTokens = 4096,
    timeout = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_RETRIES,
    signal,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 检查是否已取消
    if (signal?.aborted) {
      throw new AIError('请求已取消', 'CANCELLED', undefined, false);
    }

    const { controller, cleanup } = createTimeoutController(timeout, signal);

    try {
      const response = await fetch(`${NEW_API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NEW_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      cleanup();

      // 处理速率限制
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter 
          ? parseInt(retryAfter, 10) * 1000 
          : RATE_LIMIT_BASE_DELAY * Math.pow(2, attempt);
        
        console.warn(`AI API 速率限制，等待 ${waitTime}ms 后重试 (尝试 ${attempt + 1}/${maxRetries})`);
        
        if (attempt < maxRetries - 1) {
          await delay(waitTime);
          continue;
        }
        
        throw new AIError(
          'AI 服务繁忙，请稍后重试',
          'RATE_LIMIT',
          429,
          true
        );
      }

      // 处理服务端错误（可重试）
      if (response.status >= 500) {
        const errorText = await response.text().catch(() => '');
        console.error(`AI API 服务端错误: ${response.status}`, errorText);
        
        if (attempt < maxRetries - 1) {
          const waitTime = RATE_LIMIT_BASE_DELAY * Math.pow(2, attempt);
          await delay(waitTime);
          continue;
        }
        
        throw new AIError(
          `AI 服务暂时不可用: ${response.status}`,
          'API_ERROR',
          response.status,
          true
        );
      }

      // 处理客户端错误（不可重试）
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('AI API 客户端错误:', response.status, errorText);
        throw new AIError(
          `AI API 调用失败: ${response.status}`,
          'API_ERROR',
          response.status,
          false
        );
      }

      // 解析响应
      const data: ChatCompletionResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new AIError('AI 未返回有效响应', 'PARSE_ERROR', undefined, true);
      }

      return data.choices[0]?.message?.content || '';
    } catch (error) {
      cleanup();

      // 处理超时
      if (error instanceof DOMException && 
          (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        if (error.message === '请求超时' || error.name === 'TimeoutError') {
          console.warn(`AI API 请求超时 (尝试 ${attempt + 1}/${maxRetries})`);
          lastError = new AIError('请求超时', 'TIMEOUT', undefined, true);
          
          if (attempt < maxRetries - 1) {
            await delay(RATE_LIMIT_BASE_DELAY * (attempt + 1));
            continue;
          }
          throw lastError;
        }
        // 用户取消
        throw new AIError('请求已取消', 'CANCELLED', undefined, false);
      }

      // 如果是 AIError，直接抛出
      if (error instanceof AIError) {
        throw error;
      }

      // 其他错误
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`AI API 错误 (尝试 ${attempt + 1}/${maxRetries}):`, lastError);

      if (attempt < maxRetries - 1) {
        await delay(RATE_LIMIT_BASE_DELAY * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError instanceof AIError 
    ? lastError 
    : new AIError(
        lastError?.message || 'AI 调用失败',
        'API_ERROR',
        undefined,
        true
      );
}

export function validateQuestion(question: unknown): AIGeneratedQuestion | null {
  if (!question || typeof question !== 'object') {
    return null;
  }

  const q = question as Record<string, unknown>;

  // Validate type
  const validTypes: QuestionType[] = ['single', 'multiple', 'boolean'];
  if (!validTypes.includes(q.type as QuestionType)) {
    return null;
  }

  // Validate question_text
  if (typeof q.question_text !== 'string' || !q.question_text.trim()) {
    return null;
  }

  // Validate options
  if (!Array.isArray(q.options) || q.options.length < 2) {
    return null;
  }

  const options: QuestionOption[] = [];
  for (const opt of q.options) {
    if (
      typeof opt !== 'object' ||
      !opt ||
      typeof (opt as Record<string, unknown>).id !== 'string' ||
      typeof (opt as Record<string, unknown>).text !== 'string'
    ) {
      return null;
    }
    options.push({
      id: (opt as Record<string, unknown>).id as string,
      text: (opt as Record<string, unknown>).text as string,
    });
  }

  // Validate correct_answer
  let correctAnswer: string | string[];
  if (q.type === 'multiple') {
    if (!Array.isArray(q.correct_answer) || q.correct_answer.length === 0) {
      return null;
    }
    correctAnswer = q.correct_answer as string[];
  } else {
    if (typeof q.correct_answer !== 'string' || !q.correct_answer) {
      return null;
    }
    correctAnswer = q.correct_answer as string;
  }

  // Validate explanation
  const explanation = typeof q.explanation === 'string' ? q.explanation : '';

  return {
    type: q.type as QuestionType,
    question_text: q.question_text.trim(),
    options,
    correct_answer: correctAnswer,
    explanation,
  };
}

export function validateQuestions(rawQuestions: unknown[]): AIGeneratedQuestion[] {
  const validated: AIGeneratedQuestion[] = [];
  
  for (const q of rawQuestions) {
    const valid = validateQuestion(q);
    if (valid) {
      validated.push(valid);
    }
  }
  
  return validated;
}
