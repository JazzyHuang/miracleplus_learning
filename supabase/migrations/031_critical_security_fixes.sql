-- =============================================================
-- Migration 031: Critical Security & Data Integrity Fixes
-- Addresses: P0-2, P0-3, P0-5, P0-6, P0-7, P0-8, P1-6, P1-8,
--            P1-9, P2-2, P2-3, P2-11, P2-14, P2-25
-- =============================================================

-- P0-3: Revoke overly permissive GRANT on sensitive tables
-- These tables should ONLY be written through SECURITY DEFINER functions
REVOKE INSERT, UPDATE ON public.miracle_learning_20260209_user_point_balance FROM authenticated;
REVOKE INSERT ON public.miracle_learning_20260209_point_transactions FROM authenticated;
REVOKE INSERT, UPDATE ON public.miracle_learning_20260209_user_streaks FROM authenticated;
REVOKE INSERT ON public.miracle_learning_20260209_user_badges FROM authenticated;
-- Keep SELECT for reading
GRANT SELECT ON public.miracle_learning_20260209_user_point_balance TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_point_transactions TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_user_streaks TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_user_badges TO authenticated;

-- =============================================================
-- P0-5 + P0-8: Fix ml_add_user_points
-- - Add pg_advisory_xact_lock for atomic daily limit check
-- - Add level update using ml_calculate_user_level
-- - Add negative balance protection (P2-2)
-- - Use Asia/Shanghai timezone for daily limits (P2-25)
-- =============================================================
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
  v_caller_id UUID;
  v_new_total INTEGER;
  v_current_balance INTEGER;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
    IF NOT public.ml_is_admin() THEN
      RAISE EXCEPTION 'Permission denied: cannot add points to other users';
    END IF;
  END IF;

  -- Acquire per-user advisory lock to prevent concurrent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('ml_points_' || p_user_id::text));

  IF p_points <= 0 THEN
    -- For point deductions, check balance first (P2-2: prevent negative balance)
    IF p_points < 0 THEN
      SELECT available_points INTO v_current_balance
      FROM miracle_learning_20260209_user_point_balance
      WHERE user_id = p_user_id;
      IF v_current_balance IS NULL OR v_current_balance + p_points < 0 THEN
        RETURN 0; -- Insufficient balance
      END IF;
    END IF;
    v_actual_points := p_points;
  ELSE
    SELECT daily_limit INTO v_daily_limit
    FROM miracle_learning_20260209_point_rules
    WHERE action_type = p_action_type AND is_active = TRUE;

    -- P2-25: Use Asia/Shanghai timezone for daily limit check
    SELECT COALESCE(SUM(points), 0) INTO v_daily_total
    FROM miracle_learning_20260209_point_transactions
    WHERE user_id = p_user_id AND points > 0
      AND created_at >= (CURRENT_DATE AT TIME ZONE 'Asia/Shanghai');

    IF v_daily_total >= 300 THEN RETURN 0; END IF;
    v_actual_points := LEAST(p_points, 300 - v_daily_total);

    IF v_daily_limit IS NOT NULL THEN
      DECLARE v_action_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_action_count
        FROM miracle_learning_20260209_point_transactions
        WHERE user_id = p_user_id AND action_type = p_action_type
          AND created_at >= (CURRENT_DATE AT TIME ZONE 'Asia/Shanghai');
        IF v_action_count >= v_daily_limit THEN RETURN 0; END IF;
      END;
    END IF;
  END IF;

  IF v_actual_points = 0 THEN RETURN 0; END IF;

  INSERT INTO miracle_learning_20260209_point_transactions (user_id, points, action_type, reference_id, reference_type, description)
  VALUES (p_user_id, v_actual_points, p_action_type, p_reference_id, p_reference_type, p_description);

  -- P0-8: Calculate new total and update level
  INSERT INTO miracle_learning_20260209_user_point_balance (user_id, total_points, available_points, level, updated_at)
  VALUES (p_user_id, GREATEST(0, v_actual_points), GREATEST(0, v_actual_points), 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_points = CASE WHEN v_actual_points > 0 THEN miracle_learning_20260209_user_point_balance.total_points + v_actual_points ELSE miracle_learning_20260209_user_point_balance.total_points END,
    available_points = GREATEST(0, miracle_learning_20260209_user_point_balance.available_points + v_actual_points),
    spent_points = CASE WHEN v_actual_points < 0 THEN miracle_learning_20260209_user_point_balance.spent_points + ABS(v_actual_points) ELSE miracle_learning_20260209_user_point_balance.spent_points END,
    level = public.ml_calculate_user_level(
      CASE WHEN v_actual_points > 0
        THEN miracle_learning_20260209_user_point_balance.total_points + v_actual_points
        ELSE miracle_learning_20260209_user_point_balance.total_points
      END
    ),
    updated_at = NOW()
  RETURNING available_points INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- P0-6 + P0-7: Create atomic submit_question_with_bounty RPC
-- Combines: insert question + deduct bounty + award points
-- Bounty limit unified to 100 (P0-7)
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_submit_question_with_bounty(
  p_user_id UUID,
  p_course_id UUID,
  p_lesson_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT '',
  p_content TEXT DEFAULT '',
  p_bounty_points INTEGER DEFAULT 0
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id UUID;
  v_bounty_deducted INTEGER := 0;
  v_question_points INTEGER := 0;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Validate content length
  IF length(p_content) < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', '问题内容至少 20 字');
  END IF;

  -- Validate bounty limit (unified to 100)
  IF p_bounty_points > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', '悬赏上限为 100 积分');
  END IF;

  -- Check balance if bounty > 0
  IF p_bounty_points > 0 THEN
    DECLARE v_balance INTEGER;
    BEGIN
      SELECT available_points INTO v_balance
      FROM miracle_learning_20260209_user_point_balance
      WHERE user_id = p_user_id;
      IF v_balance IS NULL OR v_balance < p_bounty_points THEN
        RETURN jsonb_build_object('success', false, 'error', '积分余额不足');
      END IF;
    END;
  END IF;

  -- Insert question
  INSERT INTO miracle_learning_20260209_qa_questions (user_id, course_id, lesson_id, title, content, bounty_points)
  VALUES (p_user_id, p_course_id, p_lesson_id, p_title, p_content, p_bounty_points)
  RETURNING id INTO v_question_id;

  -- Deduct bounty if applicable
  IF p_bounty_points > 0 THEN
    v_bounty_deducted := public.ml_add_user_points(
      p_user_id, -p_bounty_points, 'BOUNTY_SET',
      v_question_id, 'question', '设置问答悬赏'
    );
  END IF;

  -- Award question points
  v_question_points := public.ml_add_user_points(
    p_user_id, 15, 'COURSE_QUESTION',
    v_question_id, 'question', '提问'
  );

  RETURN jsonb_build_object(
    'success', true,
    'question_id', v_question_id,
    'bounty_deducted', p_bounty_points,
    'points_earned', CASE WHEN v_question_points > 0 THEN 15 ELSE 0 END
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- P1-8: Fix like count trigger — add missing target types
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'submission' THEN UPDATE miracle_learning_20260209_workshop_submissions SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    IF NEW.target_type = 'comment' THEN UPDATE miracle_learning_20260209_comments SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    IF NEW.target_type = 'review' THEN UPDATE miracle_learning_20260209_course_reviews SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    IF NEW.target_type = 'note' THEN UPDATE miracle_learning_20260209_course_notes SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    IF NEW.target_type = 'answer' THEN UPDATE miracle_learning_20260209_qa_answers SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    IF NEW.target_type = 'experience' THEN UPDATE miracle_learning_20260209_tool_experiences SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    IF NEW.target_type = 'case' THEN UPDATE miracle_learning_20260209_tool_cases SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'submission' THEN UPDATE miracle_learning_20260209_workshop_submissions SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    IF OLD.target_type = 'comment' THEN UPDATE miracle_learning_20260209_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    IF OLD.target_type = 'review' THEN UPDATE miracle_learning_20260209_course_reviews SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    IF OLD.target_type = 'note' THEN UPDATE miracle_learning_20260209_course_notes SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    IF OLD.target_type = 'answer' THEN UPDATE miracle_learning_20260209_qa_answers SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    IF OLD.target_type = 'experience' THEN UPDATE miracle_learning_20260209_tool_experiences SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    IF OLD.target_type = 'case' THEN UPDATE miracle_learning_20260209_tool_cases SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================
-- P1-9: Fix invite code generation race condition
-- Use INSERT ON CONFLICT with retry loop
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_generate_invite_code(p_user_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Check if user already has an active invite code
  SELECT invite_code INTO v_code
  FROM miracle_learning_20260209_user_invitations
  WHERE inviter_id = p_user_id AND status = 'pending'
  LIMIT 1;

  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  -- Generate with retry to handle unique violations atomically
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Failed to generate unique invite code after 100 attempts';
    END IF;

    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    BEGIN
      INSERT INTO miracle_learning_20260209_user_invitations (inviter_id, invite_code)
      VALUES (p_user_id, v_code);
      RETURN v_code; -- Success
    EXCEPTION WHEN unique_violation THEN
      CONTINUE; -- Retry with new code
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- P1-6: Add caller identity checks to stat query RPCs
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_get_workshop_progress(UUID);

CREATE OR REPLACE FUNCTION public.ml_get_workshop_progress(p_user_id UUID)
RETURNS TABLE (total_workshops BIGINT, attended_workshops BIGINT)
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.ml_is_admin()) THEN
    RAISE EXCEPTION 'Permission denied: cannot query other user data';
  END IF;
  RETURN QUERY
    SELECT
      (SELECT COUNT(*) FROM miracle_learning_20260209_workshops WHERE is_active = TRUE) as total_workshops,
      (SELECT COUNT(DISTINCT workshop_id) FROM miracle_learning_20260209_workshop_checkins WHERE user_id = p_user_id) as attended_workshops;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.ml_get_course_completion_count(UUID);

CREATE OR REPLACE FUNCTION public.ml_get_course_completion_count(p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.ml_is_admin()) THEN
    RAISE EXCEPTION 'Permission denied: cannot query other user data';
  END IF;
  SELECT COUNT(DISTINCT course_id) INTO v_count
  FROM miracle_learning_20260209_user_lesson_progress
  WHERE user_id = p_user_id AND is_completed = TRUE;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS public.ml_get_today_points_sum(UUID);

CREATE OR REPLACE FUNCTION public.ml_get_today_points_sum(p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.ml_is_admin()) THEN
    RAISE EXCEPTION 'Permission denied: cannot query other user data';
  END IF;
  SELECT COALESCE(SUM(points), 0) INTO v_total
  FROM miracle_learning_20260209_point_transactions
  WHERE user_id = p_user_id AND points > 0
    AND created_at >= (CURRENT_DATE AT TIME ZONE 'Asia/Shanghai');
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- P2-11: Fix leaderboard safe view to exclude admins
-- =============================================================
CREATE OR REPLACE VIEW public.ml_leaderboard_safe_view AS
SELECT
  u.id,
  u.name,
  u.avatar_url,
  COALESCE(b.total_points, 0) as total_points,
  COALESCE(s.current_streak, 0) as current_streak,
  COALESCE(s.longest_streak, 0) as longest_streak,
  (SELECT COUNT(*) FROM miracle_learning_20260209_user_badges ub WHERE ub.user_id = u.id) as badge_count
FROM miracle_learning_20260209_users u
LEFT JOIN miracle_learning_20260209_user_point_balance b ON b.user_id = u.id
LEFT JOIN miracle_learning_20260209_user_streaks s ON s.user_id = u.id
WHERE u.role != 'admin'
ORDER BY COALESCE(b.total_points, 0) DESC;

-- P2-12: Restrict ml_refresh_leaderboard to admin only
CREATE OR REPLACE FUNCTION public.ml_refresh_leaderboard()
RETURNS void
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.ml_is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.ml_leaderboard_view;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- P2-14: Add missing CHECK constraints
-- =============================================================
DO $$ BEGIN
  ALTER TABLE miracle_learning_20260209_qa_questions ADD CONSTRAINT chk_bounty_points CHECK (bounty_points >= 0 AND bounty_points <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE miracle_learning_20260209_badges ADD CONSTRAINT chk_badge_tier CHECK (tier BETWEEN 1 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- P2-13: Fix milestone policy to disallow anonymous insert
DO $$ BEGIN
  DROP POLICY IF EXISTS "[ML] Insert milestones" ON miracle_learning_20260209_course_milestones;
  CREATE POLICY "[ML] Insert milestones" ON miracle_learning_20260209_course_milestones
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- =============================================================
-- P1-16: Fix email check function volatility
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_check_email_exists(TEXT);

CREATE OR REPLACE FUNCTION public.ml_check_email_exists(p_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_exists BOOLEAN;
BEGIN
  -- Add small delay to mitigate timing attacks
  PERFORM pg_sleep(0.1);
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) INTO v_exists;
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql VOLATILE; -- Fixed: was incorrectly STABLE (contains pg_sleep)

-- =============================================================
-- Grant execute on new function
-- =============================================================
GRANT EXECUTE ON FUNCTION public.ml_submit_question_with_bounty(UUID, UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;
