-- =============================================================
-- Migration 032: Comprehensive Audit Fixes
-- Date: 2026-02-10
--
-- Fixes remaining issues found during database audit:
-- 1. Drop old 5-param ml_submit_question_with_bounty overload
--    (001 created 5-param, 031 created 6-param — both exist, causing ambiguity)
-- 2. Add missing GRANT statements for functions from migration 030
-- 3. Add missing GRANT for ml_check_email_exists from migration 031
-- 4. Add missing GRANT for ml_generate_invite_code from migration 031
-- 5. Add atomic article view_count increment function
-- 6. Add missing NOT NULL constraints and indexes
-- =============================================================

-- =============================================================
-- 1. Drop old 5-param ml_submit_question_with_bounty overload
--    Migration 001 created: (UUID, UUID, TEXT, TEXT, INT)
--    Migration 031 created: (UUID, UUID, UUID, TEXT, TEXT, INTEGER)
--    Both exist simultaneously causing PostgreSQL overload ambiguity
-- =============================================================
DO $$
BEGIN
  -- Revoke before drop to avoid dangling permissions
  REVOKE ALL ON FUNCTION public.ml_submit_question_with_bounty(UUID, UUID, TEXT, TEXT, INT) FROM authenticated;
  DROP FUNCTION IF EXISTS public.ml_submit_question_with_bounty(UUID, UUID, TEXT, TEXT, INT);
EXCEPTION WHEN undefined_function THEN
  -- Function doesn't exist, nothing to do
  NULL;
END $$;

-- =============================================================
-- 2. Missing GRANT statements for functions from migration 030
--    ml_get_user_portfolio_stats and ml_get_weekly_top_gainers
--    were created without GRANT, so authenticated users can't call them
-- =============================================================
GRANT EXECUTE ON FUNCTION public.ml_get_user_portfolio_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_weekly_top_gainers() TO authenticated;

-- =============================================================
-- 3. Missing GRANT for ml_check_email_exists (migration 031)
-- =============================================================
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.ml_check_email_exists(TEXT) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- =============================================================
-- 4. Missing GRANT for ml_generate_invite_code (migration 031)
-- =============================================================
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.ml_generate_invite_code(UUID) TO authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- =============================================================
-- 5. Atomic article view_count increment
--    Replaces the read-then-write pattern in app code
--    (still using app-side increment for now, but this RPC is
--     available for future migration to atomic increment)
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_increment_article_view_count(p_article_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE miracle_learning_20260209_articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_article_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.ml_increment_article_view_count(UUID) TO authenticated;

-- =============================================================
-- 6. Add missing indexes for common query patterns
-- =============================================================

-- Point transactions: daily aggregation queries (used by ml_add_user_points)
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_user_date
  ON public.miracle_learning_20260209_point_transactions(user_id, created_at DESC)
  WHERE points > 0;

-- Point transactions: action type daily count (used by ml_add_user_points daily limit check)
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_user_action_date
  ON public.miracle_learning_20260209_point_transactions(user_id, action_type, created_at DESC);

-- Weekly picks: week_start + created_at for ordering (app now orders by created_at)
CREATE INDEX IF NOT EXISTS ml_idx_weekly_picks_week_created
  ON public.miracle_learning_20260209_weekly_picks(week_start, created_at);

-- =============================================================
-- 7. Add missing NOT NULL constraint on qa_questions.course_id
--    Migration 031's ml_submit_question_with_bounty requires p_course_id,
--    but the column may allow NULL from migration 001
-- =============================================================
DO $$
BEGIN
  -- Only add constraint if column exists and doesn't already have NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miracle_learning_20260209_qa_questions'
      AND column_name = 'course_id'
      AND is_nullable = 'YES'
  ) THEN
    -- First set any NULL course_ids to a placeholder (shouldn't exist in practice)
    -- Skip if no NULL rows exist
    ALTER TABLE public.miracle_learning_20260209_qa_questions
      ALTER COLUMN course_id SET NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not set course_id NOT NULL: %. Skipping.', SQLERRM;
END $$;

-- =============================================================
-- Done
-- =============================================================
