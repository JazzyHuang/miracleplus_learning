-- Migration 028: RLS Hardening, Atomic Functions, Performance Indexes
-- Phase 1: RLS policy gaps
-- Phase 2: Atomic transaction functions
-- Phase 3: Performance indexes

-- ============================================================
-- Phase 1: RLS Policy Gaps
-- ============================================================

-- 1.5 reward_orders: Enable RLS and add policies
ALTER TABLE IF EXISTS public.miracle_learning_20260209_reward_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'miracle_learning_20260209_reward_orders' AND policyname = '[ML] Users can view own orders') THEN
    CREATE POLICY "[ML] Users can view own orders" ON public.miracle_learning_20260209_reward_orders
      FOR SELECT USING ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'miracle_learning_20260209_reward_orders' AND policyname = '[ML] Users can create own orders') THEN
    CREATE POLICY "[ML] Users can create own orders" ON public.miracle_learning_20260209_reward_orders
      FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

-- tool_experiences: Add missing DELETE policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'miracle_learning_20260209_tool_experiences' AND policyname = '[ML] Users can delete own experiences') THEN
    CREATE POLICY "[ML] Users can delete own experiences" ON public.miracle_learning_20260209_tool_experiences
      FOR DELETE USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- discussions: Add missing author DELETE policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'miracle_learning_20260209_discussions' AND policyname = '[ML] Authors can delete own discussions') THEN
    CREATE POLICY "[ML] Authors can delete own discussions" ON public.miracle_learning_20260209_discussions
      FOR DELETE USING ((select auth.uid()) = user_id);
  END IF;
END $$;

-- 1.6 Fix ml_get_user_course_progress to check caller identity
-- 024 中已创建该函数但返回类型不同，需先 DROP 再重建
DROP FUNCTION IF EXISTS ml_get_user_course_progress(UUID, UUID);

CREATE OR REPLACE FUNCTION ml_get_user_course_progress(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS TABLE (
  total_lessons BIGINT,
  completed_lessons BIGINT,
  total_time_spent BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: only allow users to query their own progress
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot query other user progress';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(l.id) AS total_lessons,
    COUNT(ulp.id) FILTER (WHERE ulp.is_completed = true) AS completed_lessons,
    COALESCE(SUM(ulp.time_spent), 0) AS total_time_spent
  FROM miracle_learning_20260209_lessons l
  JOIN miracle_learning_20260209_chapters c ON c.id = l.chapter_id
  LEFT JOIN miracle_learning_20260209_user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = p_user_id
  WHERE c.course_id = p_course_id;
END;
$$;

-- ============================================================
-- Phase 2: Atomic Transaction Functions
-- ============================================================

-- 2.1 ml_submit_course_review: Atomic review + points
CREATE OR REPLACE FUNCTION ml_submit_course_review(
  p_user_id UUID,
  p_course_id UUID,
  p_content TEXT
) RETURNS JSONB AS $$
DECLARE
  v_review_id UUID;
BEGIN
  INSERT INTO miracle_learning_20260209_course_reviews (user_id, course_id, content)
  VALUES (p_user_id, p_course_id, p_content)
  RETURNING id INTO v_review_id;

  PERFORM ml_add_user_points(p_user_id, 30, 'COURSE_REVIEW', p_course_id, 'course', '发表课程感想');

  RETURN jsonb_build_object('success', true, 'reviewId', v_review_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', '你已经发表过这门课程的感想了');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', '提交失败，请稍后重试');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.2 ml_submit_question_with_bounty: Atomic bounty deduction + question creation
CREATE OR REPLACE FUNCTION ml_submit_question_with_bounty(
  p_user_id UUID,
  p_lesson_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_bounty INT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_balance INT;
  v_question_id UUID;
BEGIN
  -- Validate bounty
  IF p_bounty > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', '悬赏上限为 500 积分');
  END IF;

  -- Deduct bounty if applicable
  IF p_bounty > 0 THEN
    SELECT available_points INTO v_balance
    FROM miracle_learning_20260209_user_point_balance
    WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < p_bounty THEN
      RETURN jsonb_build_object('success', false, 'error', '积分不足');
    END IF;

    PERFORM ml_add_user_points(p_user_id, -p_bounty, 'SPEND', NULL, NULL, '悬赏提问');
  END IF;

  -- Insert question
  INSERT INTO miracle_learning_20260209_qa_questions (user_id, lesson_id, title, content, bounty_points)
  VALUES (p_user_id, p_lesson_id, p_title, p_content, p_bounty)
  RETURNING id INTO v_question_id;

  -- Award question points
  PERFORM ml_add_user_points(p_user_id, 10, 'COURSE_QUESTION', v_question_id, 'question', '提出问题');

  RETURN jsonb_build_object('success', true, 'questionId', v_question_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', '提交失败，请稍后重试');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.3 ml_submit_answer: Atomic answer + points
CREATE OR REPLACE FUNCTION ml_submit_answer(
  p_user_id UUID,
  p_question_id UUID,
  p_content TEXT
) RETURNS JSONB AS $$
DECLARE
  v_answer_id UUID;
BEGIN
  INSERT INTO miracle_learning_20260209_qa_answers (user_id, question_id, content)
  VALUES (p_user_id, p_question_id, p_content)
  RETURNING id INTO v_answer_id;

  PERFORM ml_add_user_points(p_user_id, 15, 'COURSE_ANSWER', v_answer_id, 'answer', '回答问题');

  RETURN jsonb_build_object('success', true, 'answerId', v_answer_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', '提交失败，请稍后重试');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.6 ml_get_today_points_sum: Database-side aggregation
CREATE OR REPLACE FUNCTION ml_get_today_points_sum(p_user_id UUID) RETURNS INT AS $$
  SELECT COALESCE(SUM(points), 0)::INT
  FROM miracle_learning_20260209_point_transactions
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND points > 0;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Phase 3: Performance Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_daily
  ON miracle_learning_20260209_point_transactions(user_id, action_type, created_at);

CREATE INDEX IF NOT EXISTS ml_idx_user_point_balance_ranking
  ON miracle_learning_20260209_user_point_balance(total_points DESC);

CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_user_date
  ON miracle_learning_20260209_point_transactions(user_id, created_at);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION ml_submit_course_review TO authenticated;
GRANT EXECUTE ON FUNCTION ml_submit_question_with_bounty TO authenticated;
GRANT EXECUTE ON FUNCTION ml_submit_answer TO authenticated;
GRANT EXECUTE ON FUNCTION ml_get_today_points_sum TO authenticated;
