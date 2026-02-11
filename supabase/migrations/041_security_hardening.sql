-- =============================================================
-- Migration 041: Security Hardening
-- Date: 2026-02-11
--
-- C1: Fix ml_log_admin_action (audit log poisoning)
-- H1: Harden ml_add_user_points (duplicate transaction guard)
-- H3: Harden ml_increment_article_view_count (per-article daily dedup)
-- M3: Unify ml_check_email_exists permissions (service_role only)
-- H4: New ml_get_popular_tags function
-- New indexes for QA and discussions
-- Clean up dead views and duplicate indexes
-- H2: ml_get_user_email (email access control)
-- M11: Rewrite ml_get_user_portfolio_stats with JOINs
-- L5: Clean up stale 037 index
-- =============================================================

BEGIN;

-- =============================================================
-- C1: Fix ml_log_admin_action — add admin check + REVOKE
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_log_admin_action(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION public.ml_log_admin_action(
  p_admin_id UUID,
  p_action_type VARCHAR(50),
  p_resource_type VARCHAR(50),
  p_resource_id VARCHAR(255) DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_log_id UUID;
BEGIN
  -- Only admins may write audit logs
  IF NOT public.ml_is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  -- admin_id must match the caller
  IF auth.uid() IS NULL OR p_admin_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: admin_id mismatch';
  END IF;

  INSERT INTO miracle_learning_20260209_admin_audit_logs (
    admin_id, action_type, resource_type, resource_id, changes, status, error_message
  ) VALUES (
    p_admin_id, p_action_type, p_resource_type, p_resource_id, p_changes, p_status, p_error_message
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.ml_log_admin_action(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ml_log_admin_action(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_log_admin_action(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT) TO service_role;

-- =============================================================
-- H1: Harden ml_add_user_points — duplicate transaction guard
-- If (user_id, action_type, reference_id) already exists, skip.
-- Also restrict to service_role only.
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ml_add_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_total INTEGER;
  v_daily_limit INTEGER;
  v_new_balance INTEGER;
  v_actual_points INTEGER;
BEGIN
  -- Duplicate guard: if a positive-point transaction with the same
  -- (user_id, action_type, reference_id) already exists, skip silently.
  IF p_points > 0 AND p_reference_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM miracle_learning_20260209_point_transactions
      WHERE user_id = p_user_id
        AND action_type = p_action_type
        AND reference_id = p_reference_id
    ) THEN
      RETURN 0;
    END IF;
  END IF;

  IF p_points <= 0 THEN
    v_actual_points := p_points;
  ELSE
    SELECT daily_limit INTO v_daily_limit
    FROM miracle_learning_20260209_point_rules
    WHERE action_type = p_action_type AND is_active = TRUE;

    SELECT COALESCE(SUM(points), 0) INTO v_daily_total
    FROM miracle_learning_20260209_point_transactions
    WHERE user_id = p_user_id AND points > 0 AND created_at >= CURRENT_DATE;

    IF v_daily_total >= 300 THEN RETURN 0; END IF;
    v_actual_points := LEAST(p_points, 300 - v_daily_total);

    IF v_daily_limit IS NOT NULL THEN
      DECLARE v_action_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_action_count
        FROM miracle_learning_20260209_point_transactions
        WHERE user_id = p_user_id AND action_type = p_action_type AND created_at >= CURRENT_DATE;
        IF v_action_count >= v_daily_limit THEN RETURN 0; END IF;
      END;
    END IF;
  END IF;

  IF v_actual_points = 0 THEN RETURN 0; END IF;

  INSERT INTO miracle_learning_20260209_point_transactions (user_id, points, action_type, reference_id, reference_type, description)
  VALUES (p_user_id, v_actual_points, p_action_type, p_reference_id, p_reference_type, p_description);

  INSERT INTO miracle_learning_20260209_user_point_balance (user_id, total_points, available_points, updated_at)
  VALUES (p_user_id, GREATEST(0, v_actual_points), GREATEST(0, v_actual_points), NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_points = CASE WHEN v_actual_points > 0 THEN miracle_learning_20260209_user_point_balance.total_points + v_actual_points ELSE miracle_learning_20260209_user_point_balance.total_points END,
    available_points = miracle_learning_20260209_user_point_balance.available_points + v_actual_points,
    spent_points = CASE WHEN v_actual_points < 0 THEN miracle_learning_20260209_user_point_balance.spent_points + ABS(v_actual_points) ELSE miracle_learning_20260209_user_point_balance.spent_points END,
    updated_at = NOW()
  RETURNING available_points INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Restrict ml_add_user_points to service_role only
REVOKE ALL ON FUNCTION public.ml_add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ml_add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) TO service_role;

-- =============================================================
-- H3: Harden ml_increment_article_view_count
-- Add advisory-lock + time-window dedup (1 increment per article per 60s)
-- No auth.uid() dependency since it may be called from cache client.
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_increment_article_view_count(UUID);

CREATE OR REPLACE FUNCTION public.ml_increment_article_view_count(p_article_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key BIGINT;
  v_last_increment TIMESTAMPTZ;
BEGIN
  -- Derive a stable advisory lock key from the article UUID
  v_lock_key := ('x' || left(replace(p_article_id::text, '-', ''), 15))::bit(64)::bigint;

  -- Try advisory lock; if another session holds it, skip (no wait)
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN;
  END IF;

  -- Time-window dedup: only increment if last increment was > 60s ago
  SELECT updated_at INTO v_last_increment
  FROM miracle_learning_20260209_articles
  WHERE id = p_article_id;

  IF v_last_increment IS NOT NULL AND v_last_increment > NOW() - INTERVAL '60 seconds' THEN
    RETURN;
  END IF;

  UPDATE miracle_learning_20260209_articles
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_article_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.ml_increment_article_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_increment_article_view_count(UUID) TO service_role;

-- =============================================================
-- M3: Unify ml_check_email_exists — service_role only
-- (040 already did this, but reinforce idempotently)
-- =============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ml_check_email_exists') THEN
    REVOKE ALL ON FUNCTION public.ml_check_email_exists(TEXT) FROM PUBLIC, authenticated, anon;
    GRANT EXECUTE ON FUNCTION public.ml_check_email_exists(TEXT) TO service_role;
  END IF;
END $$;

-- =============================================================
-- H4: New ml_get_popular_tags function
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_get_popular_tags(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(tags) AS tag, COUNT(*) AS count
  FROM miracle_learning_20260209_discussions
  WHERE status = 'active' AND tags IS NOT NULL
  GROUP BY tag
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ml_get_popular_tags(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_popular_tags(INTEGER) TO service_role;

-- =============================================================
-- New indexes: QA composite + discussions trending
-- =============================================================
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_course_lesson_created
ON miracle_learning_20260209_qa_questions(course_id, lesson_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ml_idx_discussions_trending
ON miracle_learning_20260209_discussions(is_pinned DESC, participant_count DESC, created_at DESC)
WHERE status = 'active';

-- =============================================================
-- Clean up dead code: duplicate index + dead views
-- =============================================================

-- ml_idx_user_point_balance_total (001/024) duplicates
-- ml_idx_user_point_balance_ranking (028) — same column, keep ranking
DROP INDEX IF EXISTS public.ml_idx_user_point_balance_total;

-- Dead views no longer used in app code
DROP VIEW IF EXISTS public.ml_leaderboard_safe_view;
DROP VIEW IF EXISTS public.ml_user_public_profiles;

-- =============================================================
-- H2: ml_get_user_email — email access control
-- Only the user themselves or an admin can read email.
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_get_user_email(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF auth.uid() != p_user_id AND NOT public.ml_is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN (SELECT email FROM miracle_learning_20260209_users WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ml_get_user_email(UUID) TO authenticated;

-- =============================================================
-- M11: Rewrite ml_get_user_portfolio_stats with JOINs
-- Replaces sequential correlated subqueries with a single pass.
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_get_user_portfolio_stats(UUID);

CREATE OR REPLACE FUNCTION public.ml_get_user_portfolio_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'submissions', COALESCE(sub.cnt, 0),
    'experiences', COALESCE(exp.cnt, 0),
    'cases',       COALESCE(cas.cnt, 0),
    'notes',       COALESCE(nt.cnt, 0),
    'total_likes', COALESCE(lk.cnt, 0)
  ) INTO v_result
  FROM (SELECT 1) AS _dummy

  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS cnt FROM miracle_learning_20260209_workshop_submissions WHERE user_id = p_user_id
  ) sub ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS cnt FROM miracle_learning_20260209_tool_experiences WHERE user_id = p_user_id
  ) exp ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS cnt FROM miracle_learning_20260209_tool_cases WHERE user_id = p_user_id AND status = 'approved'
  ) cas ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS cnt FROM miracle_learning_20260209_course_notes WHERE user_id = p_user_id AND is_public = TRUE
  ) nt ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(cnt), 0)::INT AS cnt FROM (
      SELECT COUNT(*) AS cnt FROM miracle_learning_20260209_likes
      WHERE target_type = 'submission'
        AND target_id::uuid IN (SELECT id FROM miracle_learning_20260209_workshop_submissions WHERE user_id = p_user_id)
      UNION ALL
      SELECT COUNT(*) AS cnt FROM miracle_learning_20260209_likes
      WHERE target_type = 'note'
        AND target_id::uuid IN (SELECT id FROM miracle_learning_20260209_course_notes WHERE user_id = p_user_id)
    ) t
  ) lk ON true;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ml_get_user_portfolio_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_user_portfolio_stats(UUID) TO service_role;

-- =============================================================
-- L5: Clean up stale 037 ai_tools index (already fixed in 040,
-- but drop the old broken one if it somehow survived)
-- =============================================================
-- 040 already recreated this correctly; this is a no-op safety net
DROP INDEX IF EXISTS public.ml_idx_ai_tools_avg_rating;
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_avg_rating
ON miracle_learning_20260209_ai_tools(avg_rating DESC, rating_count)
WHERE is_active = true;

COMMIT;
