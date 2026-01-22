import { cache } from 'react';
import { createClient } from './server';
import type { User } from '@/types/database';

/**
 * FAST: Get auth user from session (local JWT parsing, no network request).
 * Use this for read-only operations like displaying user info in layouts.
 * 
 * Note: This trusts the JWT signature. For sensitive operations (mutations,
 * payments, role checks), use getAuthUser() which validates with Supabase server.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
});

/**
 * SECURE: Get authenticated user with full server-side validation.
 * Makes a network request to Supabase Auth server to verify the token.
 * Use this for sensitive operations that require guaranteed authenticity.
 * 
 * React's cache() ensures this is only called once per request,
 * even if called from multiple components.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * Get user's profile from database.
 * Uses fast session check by default for better performance.
 * 
 * @param secure - If true, uses getAuthUser() for full validation (slower but safer)
 */
export const getUserProfile = cache(async (secure = false): Promise<User | null> => {
  const user = secure ? await getAuthUser() : await getSessionUser();
  if (!user) return null;
  
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile;
});

/**
 * Check if the current user is an admin.
 * Uses JWT claims first (faster), falls back to database if needed.
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  const user = await getSessionUser();
  if (!user) return false;
  
  // First check JWT claims (faster, no DB query)
  const roleFromMetadata = user.app_metadata?.role || user.user_metadata?.role;
  if (roleFromMetadata === 'admin') return true;
  
  // Fallback to database query
  const profile = await getUserProfile();
  return profile?.role === 'admin';
});
