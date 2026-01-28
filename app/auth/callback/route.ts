import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 认证回调路由
 * 
 * 处理以下场景：
 * 1. 邮箱验证（注册后点击验证链接）
 * 2. 密码重置（点击重置密码链接）
 * 3. 邀请链接
 * 
 * Supabase 会将用户重定向到此路由，并携带 code 参数
 * 我们需要使用 code 交换 session
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const type = requestUrl.searchParams.get('type'); // 'signup' | 'recovery' | 'invite' | 'magiclink'
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // 如果有错误参数，直接跳转到登录页并显示错误
  if (error) {
    const errorMessage = errorDescription || error;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!exchangeError) {
      // 根据类型决定跳转目标
      let redirectUrl = next;
      
      if (type === 'recovery') {
        // 密码重置流程，跳转到重置密码页面
        redirectUrl = '/reset-password';
      } else if (type === 'signup') {
        // 注册验证成功，跳转到首页并显示成功消息
        redirectUrl = '/?verified=true';
      }
      
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    
    // 交换 code 失败，可能是 code 已过期或无效
    console.error('Auth callback error:', exchangeError.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('验证链接已过期或无效，请重新注册')}`, request.url)
    );
  }

  // 没有 code 参数，跳转到登录页
  return NextResponse.redirect(new URL('/login', request.url));
}
