import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js 16 Proxy Configuration
 *
 * 功能：
 * 1. CSP nonce 注入（开发/生产不同策略）
 * 2. 认证重定向（已登录用户不能访问登录页）
 * 3. 安全头设置
 *
 * 认证保护说明：
 * - 轻量级重定向：已登录用户访问 /login 或 /register 时重定向到 /dashboard
 * - 实际路由保护由 Server Layout Guards 处理：
 *   - app/(dashboard)/layout.tsx - 保护 dashboard 相关页面
 *   - app/admin/layout.tsx - 保护 admin 页面
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // ============================================
  // 安全头 & CSP 配置
  // ============================================

  // 生成请求 ID，用于日志关联和错误追踪
  const requestId = crypto.randomUUID();
  supabaseResponse.headers.set('x-request-id', requestId);

  const isDevelopment = process.env.NODE_ENV === 'development';

  // 为生产环境生成 nonce（开发模式使用 unsafe-inline 以支持 HMR）
  const nonce = isDevelopment ? '' : Buffer.from(crypto.randomUUID()).toString('base64');

  // 构建不同的 CSP 策略
  const scriptSrc = isDevelopment
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' 'unsafe-inline'`; // unsafe-inline 用于 speculation rules

  const styleSrc = isDevelopment
    ? `style-src 'self' 'unsafe-inline'`
    : `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`; // unsafe-inline 作为 fallback

  const csp = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in",
    "media-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
  ].join('; ');

  supabaseResponse.headers.set('Content-Security-Policy', csp);

  // 只在生产环境传递 nonce
  if (nonce) {
    supabaseResponse.headers.set('x-nonce', nonce);
  }

  // 添加其他安全头
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // ============================================
  // 认证重定向逻辑
  // ============================================

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 安全修复：使用 getUser() 替代 getSession()
  // getSession() 从 cookie 读取未经验证的数据，不应在服务端代码中使用
  // getUser() 会向 Supabase Auth 服务器验证 token 并刷新 cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') ||
                     pathname.startsWith('/register') ||
                     pathname.startsWith('/auth/callback');

  // 检测 Server Action 请求（通过 next-action 头部）
  // Server Action 请求应跳过认证重定向检查，避免被意外拦截
  const isServerAction = request.headers.get('next-action') !== null;
  if (isServerAction) {
    return supabaseResponse;
  }

  // 如果已登录用户访问认证页面，重定向到主页
  if (user && isAuthPage && !pathname.startsWith('/auth/callback')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
