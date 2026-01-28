'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { loginSchema, registerSchema } from '@/lib/validations';
import { env } from '@/lib/env';

/**
 * 获取客户端 IP 地址
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
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
  // 获取客户端 IP
  const ip = await getClientIP();
  
  // 检查速率限制
  const rateLimitResult = checkRateLimit(`login:${ip}`, RATE_LIMITS.login);
  if (!rateLimitResult.success) {
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
      error: validationResult.error.errors[0]?.message || '输入验证失败',
    };
  }

  // 执行登录
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    // 如果登录失败，检查邮箱是否已注册
    if (error.message === 'Invalid login credentials') {
      // 调用 RPC 函数检查邮箱是否存在
      const { data: emailExists } = await supabase.rpc('check_email_exists', {
        target_email: formData.email,
      });
      
      if (!emailExists) {
        // 邮箱未注册，返回特定错误代码
        return {
          success: false,
          error: '该邮箱尚未注册，请先创建账号',
          errorCode: 'USER_NOT_FOUND',
        };
      }
      
      // 邮箱已注册但密码错误
      return {
        success: false,
        error: '密码错误，请检查后重试',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }
    
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
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
  // 获取客户端 IP
  const ip = await getClientIP();
  
  // 检查速率限制
  const rateLimitResult = checkRateLimit(`register:${ip}`, RATE_LIMITS.register);
  if (!rateLimitResult.success) {
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
      error: validationResult.error.errors[0]?.message || '输入验证失败',
    };
  }

  // 执行注册
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
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
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}
