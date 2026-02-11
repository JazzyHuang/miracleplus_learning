'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { loginSchema, registerSchema } from '@/lib/validations';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * 获取客户端 IP 地址
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return headersList.get('x-real-ip') || 'unknown';
}

export interface AuthResult {
  success: boolean;
  error?: string;
  errorCode?: 'USER_NOT_FOUND' | 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'VALIDATION_ERROR';
  rateLimited?: boolean;
  retryAfter?: number;
}

/**
 * 登录 Server Action（带 Rate Limiting）
 */
export async function loginAction(formData: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    // 性能优化：并行执行 IP 获取和 Supabase 客户端创建
    const [ip, supabase] = await Promise.all([
      getClientIP(),
      createClient(),
    ]);

    // 检查速率限制
    const rateLimitResult = await checkRateLimit(`login:${ip}`, RATE_LIMITS.login);
    if (!rateLimitResult.success) {
      logger.logSecurity('login_rate_limited', 'medium', { ip });
      return {
        success: false,
        error: `登录尝试过于频繁，请 ${rateLimitResult.retryAfter} 秒后再试`,
        rateLimited: true,
        retryAfter: rateLimitResult.retryAfter,
      };
    }

    // 验证输入
    const validationResult = loginSchema.safeParse(formData);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || '输入验证失败',
        errorCode: 'VALIDATION_ERROR',
      };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      // 安全修复：统一错误消息，防止邮箱枚举攻击
      // 不再区分"邮箱未注册"和"密码错误"，攻击者无法据此判断邮箱是否存在
      if (error.message === 'Invalid login credentials') {
        logger.logSecurity('login_failed_invalid_credentials', 'low', { ip });
        return {
          success: false,
          error: '邮箱或密码错误，请检查后重试',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      logger.warn('Login auth error', new Error(error.message), { ip });
      return {
        success: false,
        error: '登录失败，请稍后重试',
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('Login unexpected error', error);
    return {
      success: false,
      error: '登录服务暂时不可用，请稍后重试',
    };
  }
}

/**
 * 注册 Server Action（带 Rate Limiting）
 */
export async function registerAction(formData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  try {
    // 性能优化：并行执行 IP 获取和 Supabase 客户端创建
    const [ip, supabase] = await Promise.all([
      getClientIP(),
      createClient(),
    ]);

    // 检查速率限制
    const rateLimitResult = await checkRateLimit(`register:${ip}`, RATE_LIMITS.register);
    if (!rateLimitResult.success) {
      logger.logSecurity('register_rate_limited', 'medium', { ip });
      return {
        success: false,
        error: `注册尝试过于频繁，请 ${Math.ceil((rateLimitResult.retryAfter || 0) / 60)} 分钟后再试`,
        rateLimited: true,
        retryAfter: rateLimitResult.retryAfter,
      };
    }

    // 验证输入
    const validationResult = registerSchema.safeParse(formData);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || '输入验证失败',
        errorCode: 'VALIDATION_ERROR',
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${env.baseUrl}/auth/callback?type=signup`,
        data: {
          name: formData.name,
        },
      },
    });

    if (error) {
      // 检查是否是速率限制错误（Supabase 邮件发送限制）
      if (error.message?.toLowerCase().includes('rate limit') || error.status === 429) {
        logger.logSecurity('register_supabase_rate_limited', 'medium', { ip });
        return {
          success: false,
          error: '注册请求过于频繁，请等待几分钟后再试',
          errorCode: 'RATE_LIMITED',
          rateLimited: true,
        };
      }
      // 安全修复：统一错误消息，防止邮箱枚举攻击
      logger.warn('Register auth error', new Error(error.message), { ip });
      return {
        success: false,
        error: '注册请求处理失败，请稍后重试',
      };
    }

    // Supabase 防枚举机制：已存在的邮箱不返回错误，而是返回空 identities 数组
    // 无论邮箱是否已存在，统一返回成功消息，不泄露邮箱注册状态
    // 已存在邮箱不会收到验证邮件，但用户看到的提示是一致的
    if (data.user?.identities && data.user.identities.length === 0) {
      // 邮箱已存在 — 返回成功但不泄露此信息
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    logger.error('Register unexpected error', error);
    return {
      success: false,
      error: '注册服务暂时不可用，请稍后重试',
    };
  }
}
