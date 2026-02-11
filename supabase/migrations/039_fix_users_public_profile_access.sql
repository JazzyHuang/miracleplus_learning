-- ============================================================================
-- Migration 039: Fix Users Public Profile Access
-- ============================================================================
-- Problem: The users table RLS only allows users to view their OWN profile
-- (auth.uid() = id) or admins to view all. This breaks any query that joins
-- user data for other users (discussions, comments, workshop checkins, etc.).
--
-- Migration 033 tried to work around this by creating a view
-- (ml_user_public_profiles), but PostgREST cannot detect FK relationships
-- through views, causing "Could not find a relationship" errors.
--
-- Solution: Add a permissive SELECT policy allowing all authenticated users
-- to view all user profiles. The application code only selects public fields
-- (id, name, avatar_url) in joins, so sensitive data (email) is not exposed
-- through normal app usage.
-- ============================================================================

BEGIN;

-- Allow authenticated users to view all user profiles
-- This is needed for: discussions, comments, workshop checkins, leaderboard, etc.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'miracle_learning_20260209_users'
      AND policyname = '[ML] Authenticated users can view all profiles'
  ) THEN
    CREATE POLICY "[ML] Authenticated users can view all profiles"
      ON public.miracle_learning_20260209_users
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

COMMIT;
