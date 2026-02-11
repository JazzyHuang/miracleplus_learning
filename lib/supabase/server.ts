import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/**
 * Creates a Supabase client for Server Components that need user authentication.
 * Uses cookies to maintain user session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client for cached queries ('use cache' directive).
 * Does NOT use cookies — safe to use inside 'use cache' scoped functions.
 * 'use cache' cannot access cookies()/headers(), so this cookie-free client
 * is required for all cached database queries.
 * Only use for public read-only queries that don't require user authentication.
 *
 * 性能优化：模块级单例，避免每次调用创建新实例
 */
let _cacheClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createCacheClient() {
  if (!_cacheClient) {
    _cacheClient = createSupabaseClient(
      env.supabaseUrl,
      env.supabaseAnonKey,
      {
        global: {
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              signal: AbortSignal.timeout(10000),
            });
          },
        },
      }
    );
  }
  return _cacheClient;
}
