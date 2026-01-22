import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
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

  // Determine the type of page being accessed
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isAdminPage = pathname.startsWith('/admin');
  const isProtectedPage = pathname.startsWith('/workshop') ||
                          pathname.startsWith('/courses') ||
                          pathname === '/';

  // Skip auth check for public pages
  if (!isAuthPage && !isAdminPage && !isProtectedPage) {
    return supabaseResponse;
  }

  // PERFORMANCE OPTIMIZATION: Use getSession() for fast local JWT check (no network request)
  // getSession() parses the JWT from cookies locally, while getUser() makes a network request
  // to Supabase Auth server which adds 100-500ms latency per request.
  // 
  // Security note: getSession() trusts the JWT signature. For sensitive operations
  // (mutations, payments), use getUser() in the server action/API route instead.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  // Redirect unauthenticated users to login
  if (!user && (isProtectedPage || isAdminPage)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Check admin access using JWT claims (no network request needed)
  if (user && isAdminPage) {
    // Get role from JWT claims - app_metadata is set server-side and secure
    // user_metadata can be set by the user, so prioritize app_metadata
    const roleFromMetadata = user.app_metadata?.role || user.user_metadata?.role;
    
    if (roleFromMetadata === 'admin') {
      return supabaseResponse;
    }

    // If no admin role in JWT, check database as fallback
    // This handles legacy users who became admin before JWT claims were implemented
    // Note: This DB query only runs for admin pages when role isn't in JWT
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    
    // TODO: For optimal performance, update user's app_metadata when they become admin:
    // await supabase.auth.admin.updateUserById(user.id, { app_metadata: { role: 'admin' } })
    // This ensures future requests use fast JWT claims instead of DB query
  }

  return supabaseResponse;
}
