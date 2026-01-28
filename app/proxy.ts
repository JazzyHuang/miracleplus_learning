import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js 16 Proxy Configuration
 * 
 * 重要：根据 Next.js 16 最佳实践，认证逻辑已移至 Server Layout Guards
 * proxy.ts 只负责轻量级路由任务：重写、重定向、header 修改
 * 
 * 认证保护现在由以下 Layout 处理：
 * - app/(dashboard)/layout.tsx - 保护 dashboard 相关页面
 * - app/admin/layout.tsx - 保护 admin 页面
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // 刷新 session cookie（保持用户登录状态）
  // 这是 proxy.ts 的合适用途 - 轻量级的 cookie 刷新
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/register') ||
                     pathname.startsWith('/auth/callback');

  // 如果已登录用户访问认证页面，重定向到主页
  // 这是一个轻量级的重定向，适合在 proxy 中处理
  if (session?.user && isAuthPage && !pathname.startsWith('/auth/callback')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
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
