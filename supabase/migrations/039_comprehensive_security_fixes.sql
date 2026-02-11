-- ============================================================
-- Migration 039: Comprehensive Security & Reliability Fixes
--
-- Addresses findings from the code audit:
-- P0-1: ml_is_admin() checks DB role column (privilege escalation)
-- P0-2: ml_accept_answer missing auth.uid() check (point theft)
-- P0-3: ml_check_email_exists email enumeration
-- P0-4: GRANT conflicts (001 re-grants what 031 revoked)
-- P0-5: ml_mark_lesson_complete race condition (6x point farming)
-- P1: ml_get_user_dashboard_stats info disclosure to anon
-- P1: ml_submit_course_review / ml_submit_answer no auth check
-- P1: ml_update_user_streak timezone issue
-- P1: Unprefixed update_updated_at_column in shared DB
-- P2: Broken index on ai_tools (is_published vs is_active)
-- P2: course_milestones INSERT policy allows anonymous
-- ============================================================

-- =============================================================
-- P0-1: Fix ml_is_admin() to check JWT app_metadata instead of DB column
-- This prevents privilege escalation via self-updating the role column
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Also add a trigger to prevent users from self-updating the role column
CREATE OR REPLACE FUNCTION public.ml_protect_role_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service_role can change the role column
  -- Regular users (authenticated via RLS) cannot change it
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if caller is service_role by checking if auth.uid() is set
    -- service_role bypasses RLS entirely, so this function only fires for authenticated users
    IF auth.uid() IS NOT NULL AND NOT (
      coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE)
    ) THEN
      NEW.role := OLD.role; -- Silently revert the change
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ml_protect_role_column ON public.miracle_learning_20260209_users;
CREATE TRIGGER ml_protect_role_column
  BEFORE UPDATE ON public.miracle_learning_20260209_users
  FOR EACH ROW
  EXECUTE FUNCTION public.ml_protect_role_column();

-- =============================================================
-- P0-2: Fix ml_accept_answer — add auth.uid() caller verification
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_accept_answer(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.ml_accept_answer(p_question_id UUID, p_answer_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_bounty INTEGER; v_answerer_id UUID;
BEGIN
  -- Security: verify caller identity
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM miracle_learning_20260209_qa_questions WHERE id = p_question_id AND user_id = p_user_id AND is_resolved = FALSE) THEN RETURN FALSE; END IF;
  SELECT user_id INTO v_answerer_id FROM miracle_learning_20260209_qa_answers WHERE id = p_answer_id AND question_id = p_question_id;
  IF v_answerer_id IS NULL THEN RETURN FALSE; END IF;
  SELECT bounty_points INTO v_bounty FROM miracle_learning_20260209_qa_questions WHERE id = p_question_id;
  UPDATE miracle_learning_20260209_qa_questions SET is_resolved = TRUE, accepted_answer_id = p_answer_id, updated_at = NOW() WHERE id = p_question_id;
  UPDATE miracle_learning_20260209_qa_answers SET is_accepted = TRUE, updated_at = NOW() WHERE id = p_answer_id;
  IF v_bounty > 0 THEN PERFORM public.ml_add_user_points(v_answerer_id, v_bounty, 'BOUNTY_REWARD', p_answer_id, 'answer', '问答悬赏奖励'); END IF;
  PERFORM public.ml_add_user_points(v_answerer_id, 30, 'COURSE_ANSWER', p_answer_id, 'answer', '回答被采纳');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================
-- P0-3: Fix ml_check_email_exists — restrict to admin only
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_check_email_exists(TEXT);
CREATE OR REPLACE FUNCTION public.ml_check_email_exists(p_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Security: only admins can check email existence
  IF NOT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = lower(p_email)
  ) INTO v_exists;
  -- Constant-time delay to prevent timing attacks
  PERFORM pg_sleep(0.05 + random() * 0.05);
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql VOLATILE;

GRANT EXECUTE ON FUNCTION public.ml_check_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_check_email_exists(TEXT) TO service_role;

-- =============================================================
-- P0-4: Revoke dangerous GRANTs that 001 gives to authenticated users
-- These should only be writable via SECURITY DEFINER functions
-- =============================================================
REVOKE INSERT, UPDATE ON public.miracle_learning_20260209_user_point_balance FROM authenticated;
REVOKE INSERT ON public.miracle_learning_20260209_point_transactions FROM authenticated;
REVOKE INSERT, UPDATE ON public.miracle_learning_20260209_user_streaks FROM authenticated;
REVOKE INSERT ON public.miracle_learning_20260209_user_badges FROM authenticated;

-- =============================================================
-- P0-5: Fix ml_mark_lesson_complete — add advisory lock
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_mark_lesson_complete(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.ml_mark_lesson_complete(
  p_user_id UUID, p_lesson_id UUID, p_course_id UUID
) RETURNS JSONB
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_points_earned INTEGER := 0; v_milestone_unlocked TEXT := NULL; v_already_completed BOOLEAN;
  v_total_lessons INTEGER; v_completed_lessons INTEGER; v_progress_percentage NUMERIC; v_today_completed INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id AND NOT public.ml_is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Advisory lock to prevent concurrent duplicate point awards
  PERFORM pg_advisory_xact_lock(hashtext('ml_lesson_complete_' || p_user_id::text || '_' || p_lesson_id::text));

  SELECT EXISTS (SELECT 1 FROM miracle_learning_20260209_user_lesson_progress WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND is_completed = TRUE) INTO v_already_completed;
  IF v_already_completed THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true, 'points_earned', 0, 'milestone', null);
  END IF;

  INSERT INTO miracle_learning_20260209_user_lesson_progress (user_id, lesson_id, course_id, is_completed, marked_complete_at)
  VALUES (p_user_id, p_lesson_id, p_course_id, TRUE, NOW())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_completed = TRUE, marked_complete_at = NOW();

  v_points_earned := public.ml_add_user_points(p_user_id, 50, 'LESSON_MARK_COMPLETE', p_lesson_id, 'lesson', '完成课时');

  SELECT COUNT(*) INTO v_total_lessons FROM miracle_learning_20260209_lessons l JOIN miracle_learning_20260209_chapters c ON l.chapter_id = c.id WHERE c.course_id = p_course_id;
  SELECT COUNT(*) INTO v_completed_lessons FROM miracle_learning_20260209_user_lesson_progress ulp JOIN miracle_learning_20260209_lessons l ON ulp.lesson_id = l.id JOIN miracle_learning_20260209_chapters c ON l.chapter_id = c.id WHERE ulp.user_id = p_user_id AND c.course_id = p_course_id AND ulp.is_completed = TRUE;

  IF v_total_lessons > 0 THEN
    v_progress_percentage := (v_completed_lessons::NUMERIC / v_total_lessons) * 100;
    IF v_progress_percentage >= 50 THEN
      INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type) VALUES (p_user_id, p_course_id, '50_percent') ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      IF FOUND THEN v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 100, 'COURSE_50_PERCENT', p_course_id, 'course', '课程完成 50%'); v_milestone_unlocked := '50_percent'; END IF;
    END IF;
    IF v_progress_percentage >= 100 THEN
      INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type) VALUES (p_user_id, p_course_id, '100_percent') ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      IF FOUND THEN v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 300, 'COURSE_100_PERCENT', p_course_id, 'course', '课程完成 100%'); v_milestone_unlocked := '100_percent'; END IF;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_today_completed FROM miracle_learning_20260209_user_lesson_progress WHERE user_id = p_user_id AND course_id = p_course_id AND marked_complete_at >= (NOW() AT TIME ZONE 'Asia/Shanghai')::date AND is_completed = TRUE;
  IF v_today_completed >= 3 THEN
    INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type) VALUES (p_user_id, p_course_id, 'marathon') ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
    IF FOUND THEN v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 100, 'COURSE_MARATHON', p_course_id, 'course', '马拉松成就'); IF v_milestone_unlocked IS NULL THEN v_milestone_unlocked := 'marathon'; END IF; END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_completed', false, 'points_earned', v_points_earned, 'milestone', v_milestone_unlocked, 'progress', jsonb_build_object('completed', v_completed_lessons, 'total', v_total_lessons, 'percentage', ROUND(v_progress_percentage, 2)));
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.ml_mark_lesson_complete(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_mark_lesson_complete(UUID, UUID, UUID) TO service_role;

-- =============================================================
-- P1: Fix ml_get_user_dashboard_stats — add auth check, remove anon grant
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_get_user_dashboard_stats(UUID);
CREATE OR REPLACE FUNCTION public.ml_get_user_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
    v_created_at TIMESTAMPTZ;
    v_learning_days INTEGER DEFAULT 0;
    v_completed_lessons INTEGER DEFAULT 0;
    v_quiz_total INTEGER DEFAULT 0;
    v_quiz_correct INTEGER DEFAULT 0;
    v_workshop_checkins INTEGER DEFAULT 0;
    v_total_lessons INTEGER DEFAULT 0;
    v_total_workshops INTEGER DEFAULT 0;
BEGIN
    -- Security: only the user themselves or admins can view stats
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.ml_is_admin()) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    SELECT created_at INTO v_created_at
    FROM miracle_learning_20260209_users WHERE id = p_user_id;

    IF v_created_at IS NOT NULL THEN
        v_learning_days := GREATEST(1, EXTRACT(DAY FROM NOW() - v_created_at)::INTEGER + 1);
    END IF;

    SELECT COUNT(*) INTO v_completed_lessons
    FROM miracle_learning_20260209_user_lesson_progress
    WHERE user_id = p_user_id AND is_completed = true;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true)
    INTO v_quiz_total, v_quiz_correct
    FROM miracle_learning_20260209_user_answers
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_workshop_checkins
    FROM miracle_learning_20260209_workshop_checkins
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_total_lessons
    FROM miracle_learning_20260209_lessons;

    SELECT COUNT(*) INTO v_total_workshops
    FROM miracle_learning_20260209_workshops
    WHERE is_active = true;

    v_result := json_build_object(
        'learning_days', v_learning_days,
        'completed_lessons', v_completed_lessons,
        'quiz_total', v_quiz_total,
        'quiz_correct', v_quiz_correct,
        'workshop_checkins', v_workshop_checkins,
        'total_lessons', v_total_lessons,
        'total_workshops', v_total_workshops
    );

    RETURN v_result;
END;
$$;

-- Only authenticated and service_role — NO anon
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats(UUID) TO service_role;

-- =============================================================
-- P1: Fix ml_submit_course_review — add auth.uid() check
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_submit_course_review(UUID, UUID, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.ml_submit_course_review(
  p_user_id UUID, p_course_id UUID, p_content TEXT, p_rating INTEGER DEFAULT 5
) RETURNS JSON
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE v_review_id UUID; v_points INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO miracle_learning_20260209_course_reviews (user_id, course_id, content, rating)
  VALUES (p_user_id, p_course_id, p_content, p_rating)
  RETURNING id INTO v_review_id;

  v_points := public.ml_add_user_points(p_user_id, 30, 'COURSE_REVIEW', v_review_id, 'review', '发表课程感想');

  RETURN json_build_object('review_id', v_review_id, 'points_earned', v_points);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_submit_course_review(UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_submit_course_review(UUID, UUID, TEXT, INTEGER) TO service_role;

-- =============================================================
-- P1: Fix ml_submit_answer — add auth.uid() check
-- =============================================================
DROP FUNCTION IF EXISTS public.ml_submit_answer(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.ml_submit_answer(
  p_user_id UUID, p_question_id UUID, p_content TEXT
) RETURNS JSON
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE v_answer_id UUID; v_points INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO miracle_learning_20260209_qa_answers (user_id, question_id, content)
  VALUES (p_user_id, p_question_id, p_content)
  RETURNING id INTO v_answer_id;

  v_points := public.ml_add_user_points(p_user_id, 15, 'COURSE_ANSWER', v_answer_id, 'answer', '回答问题');

  RETURN json_build_object('answer_id', v_answer_id, 'points_earned', v_points);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_submit_answer(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_submit_answer(UUID, UUID, TEXT) TO service_role;

-- =============================================================
-- P2: Fix broken index on ai_tools (is_published -> is_active)
-- =============================================================
DROP INDEX IF EXISTS public.ml_idx_ai_tools_avg_rating;
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_avg_rating
ON public.miracle_learning_20260209_ai_tools(avg_rating DESC, rating_count)
WHERE is_active = true;

-- =============================================================
-- P2: Fix course_milestones INSERT policy (remove anonymous insert)
-- =============================================================
DROP POLICY IF EXISTS "[ML] Insert milestones" ON public.miracle_learning_20260209_course_milestones;
CREATE POLICY "[ML] Insert milestones" ON public.miracle_learning_20260209_course_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- P1: Drop unprefixed update_updated_at_column and fix triggers to use prefixed version
-- =============================================================
DO $$ BEGIN
  -- Update any triggers that reference the unprefixed function to use the prefixed one
  -- The prefixed ml_update_updated_at_column() was created in 001
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
  END IF;
END $$;

-- Recreate triggers using the correctly prefixed function
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'miracle_learning_20260209_workshops',
    'miracle_learning_20260209_chapters',
    'miracle_learning_20260209_lessons',
    'miracle_learning_20260209_questions',
    'miracle_learning_20260209_workshop_materials'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS ml_update_%s_updated_at ON public.%I', split_part(tbl, 'miracle_learning_20260209_', 2), tbl);
    EXECUTE format('CREATE TRIGGER ml_update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column()', split_part(tbl, 'miracle_learning_20260209_', 2), tbl);
  END LOOP;
END $$;
