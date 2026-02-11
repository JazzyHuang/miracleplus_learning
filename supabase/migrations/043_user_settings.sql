-- Migration 043: User Settings Table + Bio Column
-- Creates user_settings table for preferences and adds bio to users table

-- ============================================================
-- 1. Create user_settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 隐私设置
  show_on_leaderboard BOOLEAN NOT NULL DEFAULT true,
  show_profile_public BOOLEAN NOT NULL DEFAULT true,
  show_activity BOOLEAN NOT NULL DEFAULT true,
  -- 通知偏好
  email_course_updates BOOLEAN NOT NULL DEFAULT true,
  email_community_replies BOOLEAN NOT NULL DEFAULT true,
  email_weekly_digest BOOLEAN NOT NULL DEFAULT true,
  email_point_milestones BOOLEAN NOT NULL DEFAULT true,
  -- 学习偏好
  font_size TEXT NOT NULL DEFAULT 'md' CHECK (font_size IN ('sm', 'md', 'lg')),
  reduce_motion BOOLEAN NOT NULL DEFAULT false,
  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. RLS Policies
-- ============================================================
ALTER TABLE miracle_learning_20260209_user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'miracle_learning_20260209_user_settings'
    AND policyname = '[ML] Users can view own settings'
  ) THEN
    CREATE POLICY "[ML] Users can view own settings"
      ON miracle_learning_20260209_user_settings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'miracle_learning_20260209_user_settings'
    AND policyname = '[ML] Users can insert own settings'
  ) THEN
    CREATE POLICY "[ML] Users can insert own settings"
      ON miracle_learning_20260209_user_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'miracle_learning_20260209_user_settings'
    AND policyname = '[ML] Users can update own settings'
  ) THEN
    CREATE POLICY "[ML] Users can update own settings"
      ON miracle_learning_20260209_user_settings
      FOR UPDATE USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. Updated_at trigger (reuse existing function)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'ml_update_user_settings_updated_at'
  ) THEN
    CREATE TRIGGER ml_update_user_settings_updated_at
      BEFORE UPDATE ON miracle_learning_20260209_user_settings
      FOR EACH ROW EXECUTE FUNCTION ml_update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- 4. Add bio column to users table
-- ============================================================
ALTER TABLE miracle_learning_20260209_users
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Add length constraint via check (idempotent with DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'miracle_learning_20260209_users_bio_length'
  ) THEN
    ALTER TABLE miracle_learning_20260209_users
      ADD CONSTRAINT miracle_learning_20260209_users_bio_length
      CHECK (char_length(bio) <= 200);
  END IF;
END $$;
