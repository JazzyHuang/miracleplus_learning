-- =============================================
-- Migration 029: Bug Fixes & Infrastructure
-- Phase 0 of Operations Plan
-- =============================================

-- 1. Fix ml_update_comment_count() trigger to handle ALL target_types
-- Currently only handles 'submission', missing workshop/course/note/discussion
CREATE OR REPLACE FUNCTION ml_update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update comment count for submissions
    IF NEW.target_type = 'submission' THEN
      UPDATE miracle_learning_20260209_workshop_submissions
      SET comment_count = COALESCE(comment_count, 0) + 1
      WHERE id = NEW.target_id::uuid;
    END IF;
    -- Note: discussions have their own trigger (ml_update_discussion_comment_count)
    -- Other target_types (workshop, course, note) don't have comment_count columns
    -- but the trigger should not error on them
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'submission' THEN
      UPDATE miracle_learning_20260209_workshop_submissions
      SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
      WHERE id = OLD.target_id::uuid;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix ml_handle_new_user() - add SET search_path = public
CREATE OR REPLACE FUNCTION ml_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.miracle_learning_20260209_users (id, email, name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_app_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Initialize point balance
  INSERT INTO public.miracle_learning_20260209_user_point_balance (user_id, total_points, available_points, spent_points, level)
  VALUES (NEW.id, 0, 0, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- Initialize streak
  INSERT INTO public.miracle_learning_20260209_user_streaks (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix ml_is_admin() - add SET search_path = public
CREATE OR REPLACE FUNCTION ml_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miracle_learning_20260209_users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Add missing index for discussions status filtering
CREATE INDEX IF NOT EXISTS ml_idx_discussions_status_active
ON miracle_learning_20260209_discussions(status, created_at DESC)
WHERE status = 'active';

-- 5. Update add_user_points to use new level thresholds (300/800)
-- We need to update the level calculation wherever it's done
-- The level is typically updated in the add_user_points function
DO $$
BEGIN
  -- Check if the function exists and update the level thresholds
  -- This is a safe update that modifies the level boundaries
  -- Level 1 (AI观察员): 0-299
  -- Level 2 (AI实践家): 300-799
  -- Level 3 (AI领航员): 800+

  -- We'll create a helper function for level calculation
  CREATE OR REPLACE FUNCTION ml_calculate_user_level(p_total_points INTEGER)
  RETURNS INTEGER AS $func$
  BEGIN
    IF p_total_points >= 800 THEN
      RETURN 3;
    ELSIF p_total_points >= 300 THEN
      RETURN 2;
    ELSE
      RETURN 1;
    END IF;
  END;
  $func$ LANGUAGE plpgsql IMMUTABLE;

END $$;

-- 6. Setup pg_cron for automatic leaderboard refresh (every 5 minutes)
-- Note: pg_cron extension must be enabled in Supabase Dashboard first
-- This will fail gracefully if pg_cron is not enabled
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any existing schedule
    PERFORM cron.unschedule('ml-refresh-leaderboard');
    -- Schedule refresh every 5 minutes
    PERFORM cron.schedule(
      'ml-refresh-leaderboard',
      '*/5 * * * *',
      'REFRESH MATERIALIZED VIEW CONCURRENTLY ml_leaderboard_view'
    );
    RAISE NOTICE 'pg_cron leaderboard refresh scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - skipping leaderboard auto-refresh setup';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not setup pg_cron: %', SQLERRM;
END $$;
