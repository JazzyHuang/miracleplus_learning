-- ============================================================================
-- Migration 040: Security Audit Fixes
-- ============================================================================
-- Addresses findings from SRE, DBA, and Red Team audits:
--
-- P0: ml_is_admin() checks DB column instead of app_metadata (Red Team P0-2)
-- P0: ml_accept_answer has no caller identity check (DBA P0-3)
-- P0: ml_mark_lesson_complete has no advisory lock (DBA P0-2)
-- P1: ml_get_user_dashboard_stats has no auth check + granted to anon (DBA P1-8/P1-9)
-- P1: ml_submit_course_review lacks caller identity check (Red Team P1-7)
-- P1: ml_submit_answer lacks caller identity check (Red Team P1-7)
-- P2: ai_tools index uses non-existent is_published column (DBA P2-4)
-- P1: Users UPDATE RLS allows self-promotion to admin (Red Team P0-2 fix)
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. Fix ml_is_admin() — check app_metadata instead of DB column
--    Prevents privilege escalation via direct DB role column update
--    NOTE: No DROP — 60+ RLS policies depend on this function.
--    CREATE OR REPLACE is safe because signature (returns BOOLEAN) is unchanged.
-- ============================================================
CREATE OR REPLACE FUNCTION public.ml_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Restrict users UPDATE RLS — prevent self-promotion to admin
--    Users can update their own profile but NOT the role column
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can update own profile" ON public.miracle_learning_20260209_users;

CREATE POLICY "[ML] Users can update own profile"
  ON public.miracle_learning_20260209_users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.miracle_learning_20260209_users WHERE id = auth.uid())
  );

-- ============================================================
-- 3. Fix ml_accept_answer — add caller identity check
--    DROP first to handle any return-type mismatch from prior migrations
-- ============================================================
DROP FUNCTION IF EXISTS public.ml_accept_answer(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.ml_accept_answer(
  p_question_id UUID, p_answer_id UUID, p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_bounty INTEGER;
  v_answerer_id UUID;
BEGIN
  -- Security: verify caller is the user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM miracle_learning_20260209_qa_questions
    WHERE id = p_question_id AND user_id = p_user_id AND is_resolved = FALSE
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT user_id INTO v_answerer_id
  FROM miracle_learning_20260209_qa_answers
  WHERE id = p_answer_id AND question_id = p_question_id;

  IF v_answerer_id IS NULL THEN RETURN FALSE; END IF;

  SELECT bounty_points INTO v_bounty
  FROM miracle_learning_20260209_qa_questions WHERE id = p_question_id;

  UPDATE miracle_learning_20260209_qa_questions
  SET is_resolved = TRUE, accepted_answer_id = p_answer_id, updated_at = NOW()
  WHERE id = p_question_id;

  UPDATE miracle_learning_20260209_qa_answers
  SET is_accepted = TRUE, updated_at = NOW()
  WHERE id = p_answer_id;

  IF v_bounty > 0 THEN
    PERFORM public.ml_add_user_points(v_answerer_id, v_bounty, 'BOUNTY_REWARD', p_answer_id, 'answer', '问答悬赏奖励');
  END IF;

  PERFORM public.ml_add_user_points(v_answerer_id, 30, 'COURSE_ANSWER', p_answer_id, 'answer', '回答被采纳');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Fix ml_mark_lesson_complete — add advisory lock
--    Prevents duplicate point awards from concurrent requests
--    DROP first to handle any return-type mismatch from prior migrations
-- ============================================================
DROP FUNCTION IF EXISTS public.ml_mark_lesson_complete(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.ml_mark_lesson_complete(
  p_user_id UUID, p_lesson_id UUID, p_course_id UUID
) RETURNS JSONB
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_points_earned INTEGER := 0;
  v_milestone_unlocked TEXT := NULL;
  v_already_completed BOOLEAN;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_progress_percentage NUMERIC;
  v_today_completed INTEGER;
BEGIN
  -- Security: verify caller identity
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id AND NOT public.ml_is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Advisory lock to prevent concurrent duplicate completions
  PERFORM pg_advisory_xact_lock(hashtext('ml_complete_' || p_user_id::text || '_' || p_lesson_id::text));

  SELECT EXISTS (
    SELECT 1 FROM miracle_learning_20260209_user_lesson_progress
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND is_completed = TRUE
  ) INTO v_already_completed;

  IF v_already_completed THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true, 'points_earned', 0, 'milestone', null);
  END IF;

  INSERT INTO miracle_learning_20260209_user_lesson_progress (user_id, lesson_id, course_id, is_completed, marked_complete_at)
  VALUES (p_user_id, p_lesson_id, p_course_id, TRUE, NOW())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_completed = TRUE, marked_complete_at = NOW();

  v_points_earned := public.ml_add_user_points(p_user_id, 50, 'LESSON_MARK_COMPLETE', p_lesson_id, 'lesson', '完成课时');

  SELECT COUNT(*) INTO v_total_lessons
  FROM miracle_learning_20260209_lessons l
  JOIN miracle_learning_20260209_chapters c ON l.chapter_id = c.id
  WHERE c.course_id = p_course_id;

  SELECT COUNT(*) INTO v_completed_lessons
  FROM miracle_learning_20260209_user_lesson_progress ulp
  JOIN miracle_learning_20260209_lessons l ON ulp.lesson_id = l.id
  JOIN miracle_learning_20260209_chapters c ON l.chapter_id = c.id
  WHERE ulp.user_id = p_user_id AND c.course_id = p_course_id AND ulp.is_completed = TRUE;

  IF v_total_lessons > 0 THEN
    v_progress_percentage := (v_completed_lessons::NUMERIC / v_total_lessons) * 100;
    IF v_progress_percentage >= 50 THEN
      INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type)
      VALUES (p_user_id, p_course_id, '50_percent')
      ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      IF FOUND THEN
        v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 100, 'COURSE_50_PERCENT', p_course_id, 'course', '课程完成 50%');
        v_milestone_unlocked := '50_percent';
      END IF;
    END IF;
    IF v_progress_percentage >= 100 THEN
      INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type)
      VALUES (p_user_id, p_course_id, '100_percent')
      ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      IF FOUND THEN
        v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 300, 'COURSE_100_PERCENT', p_course_id, 'course', '课程完成 100%');
        v_milestone_unlocked := '100_percent';
      END IF;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_today_completed
  FROM miracle_learning_20260209_user_lesson_progress
  WHERE user_id = p_user_id AND course_id = p_course_id
    AND marked_complete_at >= CURRENT_DATE AND is_completed = TRUE;

  IF v_today_completed >= 3 THEN
    INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type)
    VALUES (p_user_id, p_course_id, 'marathon')
    ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
    IF FOUND THEN
      v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 100, 'COURSE_MARATHON', p_course_id, 'course', '马拉松成就');
      IF v_milestone_unlocked IS NULL THEN v_milestone_unlocked := 'marathon'; END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'already_completed', false,
    'points_earned', v_points_earned, 'milestone', v_milestone_unlocked,
    'progress', jsonb_build_object('completed', v_completed_lessons, 'total', v_total_lessons, 'percentage', ROUND(v_progress_percentage, 2))
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Fix ml_get_user_dashboard_stats — add auth check, revoke anon
--    DROP first to handle any return-type mismatch from prior migrations
-- ============================================================
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
    -- Security: only allow querying own stats (or admin)
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

-- Revoke anon access, only authenticated and service_role
REVOKE ALL ON FUNCTION public.ml_get_user_dashboard_stats(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats(UUID) TO service_role;

-- ============================================================
-- 6. Fix ml_submit_course_review — add caller identity check
--    DROP first to handle any return-type mismatch from prior migrations
-- ============================================================
DROP FUNCTION IF EXISTS public.ml_submit_course_review(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.ml_submit_course_review(
  p_user_id UUID, p_course_id UUID, p_content TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_review_id UUID;
  v_points INTEGER := 0;
BEGIN
  -- Security: verify caller is the user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Insert review
  INSERT INTO miracle_learning_20260209_course_reviews (user_id, course_id, content)
  VALUES (p_user_id, p_course_id, p_content)
  RETURNING id INTO v_review_id;

  -- Award points atomically
  v_points := public.ml_add_user_points(p_user_id, 50, 'COURSE_REVIEW', p_course_id, 'course', '发表课程感想');

  RETURN jsonb_build_object('success', true, 'review_id', v_review_id, 'points_earned', v_points);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', '你已经发表过这门课程的感想了');
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_submit_course_review(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
-- 7. Fix ml_submit_answer — add caller identity check
--    DROP first to handle any return-type mismatch from prior migrations
-- ============================================================
DROP FUNCTION IF EXISTS public.ml_submit_answer(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.ml_submit_answer(
  p_user_id UUID, p_question_id UUID, p_content TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_answer_id UUID;
  v_question_user_id UUID;
  v_points INTEGER := 0;
BEGIN
  -- Security: verify caller is the user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Prevent self-answering
  SELECT user_id INTO v_question_user_id
  FROM miracle_learning_20260209_qa_questions WHERE id = p_question_id;

  IF v_question_user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', '不能回答自己的问题');
  END IF;

  -- Insert answer
  INSERT INTO miracle_learning_20260209_qa_answers (user_id, question_id, content)
  VALUES (p_user_id, p_question_id, p_content)
  RETURNING id INTO v_answer_id;

  -- Award points atomically
  v_points := public.ml_add_user_points(p_user_id, 30, 'COURSE_ANSWER', v_answer_id, 'answer', '回答问题');

  RETURN jsonb_build_object('success', true, 'answer_id', v_answer_id, 'points_earned', v_points);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_submit_answer(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
-- 8. Fix ai_tools index — use is_active instead of is_published
-- ============================================================
DROP INDEX IF EXISTS public.ml_idx_ai_tools_avg_rating;

CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_avg_rating
ON public.miracle_learning_20260209_ai_tools(avg_rating DESC, rating_count)
WHERE is_active = true;

-- ============================================================
-- 9. Revoke ml_check_email_exists from authenticated
--    Prevents email enumeration by logged-in users
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ml_check_email_exists') THEN
    REVOKE ALL ON FUNCTION public.ml_check_email_exists(TEXT) FROM authenticated;
    REVOKE ALL ON FUNCTION public.ml_check_email_exists(TEXT) FROM anon;
    -- Only service_role should call this
    GRANT EXECUTE ON FUNCTION public.ml_check_email_exists(TEXT) TO service_role;
  END IF;
END $$;

COMMIT;
