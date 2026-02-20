-- =============================================================
-- 056: Critical Security Fixes
-- Advisory locks for TOCTOU prevention + atomic streak freeze RPC
-- Admin permission checks for analytics RPCs
-- =============================================================

-- =============================================
-- 0.1 ml_add_user_points: advisory lock 防止每日限额 TOCTOU 竞态
-- =============================================
DROP FUNCTION IF EXISTS public.ml_add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.ml_add_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_total INTEGER;
  v_daily_limit INTEGER;
  v_new_balance INTEGER;
  v_actual_points INTEGER;
  v_caller_id UUID;
  v_action_count INTEGER;
BEGIN
  -- Advisory lock: 防止同一用户并发绕过每日限额
  PERFORM pg_advisory_xact_lock(hashtext('ml_points_' || p_user_id::text));

  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
    IF NOT public.ml_is_admin() THEN
      RAISE EXCEPTION 'Permission denied: cannot add points to other users';
    END IF;
  END IF;

  IF p_points <= 0 THEN
    -- 负积分（消费）：检查可用余额是否足够，防止余额为负
    SELECT available_points INTO v_new_balance
    FROM miracle_learning_20260209_user_point_balance
    WHERE user_id = p_user_id;
    IF v_new_balance IS NULL OR v_new_balance < ABS(p_points) THEN
      RETURN 0;  -- 余额不足
    END IF;
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
      SELECT COUNT(*) INTO v_action_count
      FROM miracle_learning_20260209_point_transactions
      WHERE user_id = p_user_id AND action_type = p_action_type AND created_at >= CURRENT_DATE;
      IF v_action_count >= v_daily_limit THEN RETURN 0; END IF;
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
$$;

GRANT EXECUTE ON FUNCTION public.ml_add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;

-- =============================================
-- 0.2 ml_update_user_streak: advisory lock 防止并发重复签到积分
-- =============================================
DROP FUNCTION IF EXISTS public.ml_update_user_streak(UUID);
CREATE OR REPLACE FUNCTION public.ml_update_user_streak(p_user_id UUID)
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER, points_earned INTEGER, badge_unlocked TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_login DATE; v_current_streak INTEGER; v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE; v_points_earned INTEGER := 0; v_badge_unlocked TEXT := NULL;
BEGIN
  -- Advisory lock: 防止同一用户并发重复签到
  PERFORM pg_advisory_xact_lock(hashtext('ml_streak_' || p_user_id::text));

  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied: can only update own streak';
  END IF;

  INSERT INTO miracle_learning_20260209_user_streaks (user_id, current_streak, longest_streak, last_login_date, streak_start_date)
  VALUES (p_user_id, 0, 0, NULL, NULL) ON CONFLICT (user_id) DO NOTHING;

  SELECT us.last_login_date, us.current_streak, us.longest_streak
  INTO v_last_login, v_current_streak, v_longest_streak
  FROM miracle_learning_20260209_user_streaks us WHERE us.user_id = p_user_id;

  IF v_last_login = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, 0, NULL::TEXT; RETURN;
  END IF;

  IF v_last_login IS NULL OR v_last_login < v_today - 1 THEN
    v_current_streak := 1;
    UPDATE miracle_learning_20260209_user_streaks SET current_streak = 1, last_login_date = v_today, streak_start_date = v_today, updated_at = NOW() WHERE user_id = p_user_id;
  ELSE
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN v_longest_streak := v_current_streak; END IF;
    UPDATE miracle_learning_20260209_user_streaks SET current_streak = v_current_streak, longest_streak = v_longest_streak, last_login_date = v_today, updated_at = NOW() WHERE user_id = p_user_id;
  END IF;

  v_points_earned := public.ml_add_user_points(p_user_id, 5, 'DAILY_LOGIN', NULL, NULL, '每日登录奖励');

  IF v_current_streak = 7 THEN
    v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 50, 'WEEKLY_STREAK', NULL, NULL, '连续登录7天奖励');
    v_badge_unlocked := 'STREAK_7';
  ELSIF v_current_streak = 30 THEN
    v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 200, 'MONTHLY_STREAK', NULL, NULL, '连续登录30天奖励');
    v_badge_unlocked := 'STREAK_30';
  ELSIF v_current_streak = 100 THEN
    v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 500, 'STREAK_100', NULL, NULL, '连续登录100天奖励');
    v_badge_unlocked := 'STREAK_100';
  END IF;

  IF v_badge_unlocked IS NOT NULL THEN
    INSERT INTO miracle_learning_20260209_user_badges (user_id, badge_id)
    SELECT p_user_id, b.id FROM miracle_learning_20260209_badges b WHERE b.code = v_badge_unlocked
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_points_earned, v_badge_unlocked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_update_user_streak(UUID) TO authenticated;

-- =============================================
-- 0.3 ml_purchase_streak_freeze: 原子化购买操作
-- =============================================
CREATE OR REPLACE FUNCTION public.ml_purchase_streak_freeze(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_freeze_count INTEGER;
  v_cost INTEGER := 100;
  v_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('ml_freeze_' || p_user_id::text));

  SELECT freeze_count INTO v_freeze_count
  FROM miracle_learning_20260209_user_streaks
  WHERE user_id = p_user_id;

  IF v_freeze_count IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '未找到连续登录记录');
  END IF;
  IF v_freeze_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', '最多持有2个保护', 'freezeCount', v_freeze_count);
  END IF;

  SELECT available_points INTO v_balance
  FROM miracle_learning_20260209_user_point_balance
  WHERE user_id = p_user_id;

  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', '积分不足', 'freezeCount', v_freeze_count);
  END IF;

  INSERT INTO miracle_learning_20260209_point_transactions
    (user_id, points, action_type, description)
  VALUES (p_user_id, -v_cost, 'STREAK_FREEZE_PURCHASE', '购买连续登录保护');

  UPDATE miracle_learning_20260209_user_point_balance
  SET available_points = available_points - v_cost,
      spent_points = spent_points + v_cost,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE miracle_learning_20260209_user_streaks
  SET freeze_count = freeze_count + 1, updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'freezeCount', v_freeze_count + 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_purchase_streak_freeze(UUID) TO authenticated;

-- =============================================
-- 0.4 Analytics RPCs: 添加 admin 权限检查
-- =============================================

-- 0.4a ml_analytics_overview
DROP FUNCTION IF EXISTS public.ml_analytics_overview(INTEGER);
CREATE OR REPLACE FUNCTION ml_analytics_overview(
  p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_start DATE := CURRENT_DATE - p_days;
  v_prev_start DATE := CURRENT_DATE - (p_days * 2);
  v_prev_end DATE := CURRENT_DATE - p_days;
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM miracle_learning_20260209_users WHERE role != 'admin'),
    'new_users_period', (SELECT COUNT(*) FROM miracle_learning_20260209_users WHERE role != 'admin' AND created_at::date >= v_start),
    'new_users_prev', (SELECT COUNT(*) FROM miracle_learning_20260209_users WHERE role != 'admin' AND created_at::date >= v_prev_start AND created_at::date < v_prev_end),
    'dau_avg', (SELECT COALESCE(ROUND(AVG(dau)), 0) FROM ml_analytics_daily_activity WHERE activity_date >= v_start),
    'dau_avg_prev', (SELECT COALESCE(ROUND(AVG(dau)), 0) FROM ml_analytics_daily_activity WHERE activity_date >= v_prev_start AND activity_date < v_prev_end),
    'wau', (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_point_transactions WHERE created_at >= CURRENT_DATE - 7),
    'mau', (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_point_transactions WHERE created_at >= CURRENT_DATE - 30),
    'lessons_completed_period', (SELECT COUNT(*) FROM miracle_learning_20260209_user_lesson_progress WHERE is_completed = true AND marked_complete_at >= v_start),
    'lessons_completed_prev', (SELECT COUNT(*) FROM miracle_learning_20260209_user_lesson_progress WHERE is_completed = true AND marked_complete_at >= v_prev_start AND marked_complete_at < v_prev_end),
    'avg_time_spent', (SELECT COALESCE(ROUND(AVG(time_spent)), 0) FROM miracle_learning_20260209_user_lesson_progress WHERE time_spent > 0 AND updated_at >= v_start),
    'workshop_participants', (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_workshop_checkins WHERE created_at >= v_start),
    'community_posts', (SELECT COUNT(*) FROM miracle_learning_20260209_discussions WHERE created_at >= v_start AND status = 'active'),
    'avg_engagement_score', (SELECT COALESCE(ROUND(AVG(engagement_score), 1), 0) FROM ml_analytics_user_engagement),
    'level_distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('level', level, 'count', cnt) ORDER BY level), '[]'::jsonb)
      FROM (SELECT COALESCE(level, 1) AS level, COUNT(*) AS cnt FROM miracle_learning_20260209_user_point_balance GROUP BY level) sub
    ),
    'daily_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', activity_date, 'dau', dau, 'new_users', new_users) ORDER BY activity_date), '[]'::jsonb)
      FROM ml_analytics_daily_activity WHERE activity_date >= v_start
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 0.4b ml_analytics_activity_trends
DROP FUNCTION IF EXISTS public.ml_analytics_activity_trends(DATE, DATE);
CREATE OR REPLACE FUNCTION ml_analytics_activity_trends(
  p_start_date DATE DEFAULT CURRENT_DATE - 30,
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
  activity_date DATE, dau BIGINT, total_actions BIGINT,
  learning_users BIGINT, workshop_users BIGINT,
  community_users BIGINT, ai_tool_users BIGINT, new_users BIGINT
) AS $$
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  RETURN QUERY
  SELECT da.activity_date, da.dau, da.total_actions,
    da.learning_users, da.workshop_users,
    da.community_users, da.ai_tool_users, da.new_users
  FROM ml_analytics_daily_activity da
  WHERE da.activity_date BETWEEN p_start_date AND p_end_date
  ORDER BY da.activity_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 0.4c ml_analytics_learning_funnel
DROP FUNCTION IF EXISTS public.ml_analytics_learning_funnel(INTEGER);
CREATE OR REPLACE FUNCTION ml_analytics_learning_funnel(
  p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  v_start DATE := CURRENT_DATE - p_days;
  v_result JSONB;
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  SELECT jsonb_build_object('steps', jsonb_build_array(
    jsonb_build_object('name', '注册用户', 'count',
      (SELECT COUNT(*) FROM miracle_learning_20260209_users WHERE role != 'admin' AND created_at::date >= v_start)),
    jsonb_build_object('name', '开始学习', 'count',
      (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_user_lesson_progress WHERE created_at >= v_start)),
    jsonb_build_object('name', '完成首节课', 'count',
      (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_user_lesson_progress WHERE is_completed = true AND marked_complete_at >= v_start)),
    jsonb_build_object('name', '完成测验', 'count',
      (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_point_transactions WHERE action_type = 'QUIZ_PERFECT' AND created_at >= v_start)),
    jsonb_build_object('name', '完成50%课程', 'count',
      (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_point_transactions WHERE action_type = 'COURSE_50_PERCENT' AND created_at >= v_start)),
    jsonb_build_object('name', '完成100%课程', 'count',
      (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_point_transactions WHERE action_type = 'COURSE_100_PERCENT' AND created_at >= v_start)),
    jsonb_build_object('name', '参与社区', 'count',
      (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_point_transactions WHERE action_type IN ('DISCUSSION_POST','CREATE_DISCUSSION','COMMENT') AND created_at >= v_start))
  )) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 0.4d ml_analytics_user_segments
DROP FUNCTION IF EXISTS public.ml_analytics_user_segments();
CREATE OR REPLACE FUNCTION ml_analytics_user_segments()
RETURNS JSONB AS $$
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'segment', segment, 'user_count', cnt, 'avg_engagement_score', avg_score
    ) ORDER BY
      CASE segment WHEN 'power' THEN 1 WHEN 'active' THEN 2 WHEN 'casual' THEN 3 WHEN 'at_risk' THEN 4 ELSE 5 END
    ), '[]'::jsonb)
    FROM (
      SELECT segment, COUNT(*) AS cnt, ROUND(AVG(engagement_score), 1) AS avg_score
      FROM ml_analytics_user_engagement GROUP BY segment
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 0.4e ml_analytics_content_stats
DROP FUNCTION IF EXISTS public.ml_analytics_content_stats();
CREATE OR REPLACE FUNCTION ml_analytics_content_stats()
RETURNS TABLE(
  course_id UUID, course_title TEXT, total_lessons BIGINT,
  total_enrollments BIGINT, total_completions BIGINT,
  completion_rate NUMERIC, avg_time_per_lesson NUMERIC,
  total_questions BIGINT, total_reviews BIGINT
) AS $$
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  RETURN QUERY
  SELECT
    c.id AS course_id, c.title AS course_title,
    COUNT(DISTINCT l.id) AS total_lessons,
    COUNT(DISTINCT ulp.user_id) AS total_enrollments,
    COUNT(DISTINCT ulp.user_id) FILTER (WHERE ulp.is_completed = true) AS total_completions,
    CASE WHEN COUNT(DISTINCT ulp.user_id) > 0
      THEN ROUND(COUNT(DISTINCT ulp.user_id) FILTER (WHERE ulp.is_completed = true)::numeric
        / COUNT(DISTINCT ulp.user_id) * 100, 1)
      ELSE 0 END AS completion_rate,
    COALESCE(ROUND(AVG(ulp.time_spent) FILTER (WHERE ulp.time_spent > 0)), 0) AS avg_time_per_lesson,
    (SELECT COUNT(*) FROM miracle_learning_20260209_qa_questions q WHERE q.course_id = c.id) AS total_questions,
    (SELECT COUNT(*) FROM miracle_learning_20260209_course_reviews cr WHERE cr.course_id = c.id) AS total_reviews
  FROM miracle_learning_20260209_courses c
  LEFT JOIN miracle_learning_20260209_chapters ch ON ch.course_id = c.id
  LEFT JOIN miracle_learning_20260209_lessons l ON l.chapter_id = ch.id
  LEFT JOIN miracle_learning_20260209_user_lesson_progress ulp ON ulp.lesson_id = l.id
  WHERE c.is_published = true
  GROUP BY c.id, c.title
  ORDER BY total_enrollments DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 0.4f ml_analytics_user_detail
DROP FUNCTION IF EXISTS public.ml_analytics_user_detail(UUID);
CREATE OR REPLACE FUNCTION ml_analytics_user_detail(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  SELECT jsonb_build_object(
    'user', (
      SELECT jsonb_build_object(
        'id', u.id, 'name', u.name, 'email', u.email,
        'avatar_url', u.avatar_url, 'level', COALESCE(pb.level, 1),
        'total_points', COALESCE(pb.total_points, 0)
      )
      FROM miracle_learning_20260209_users u
      LEFT JOIN miracle_learning_20260209_user_point_balance pb ON pb.user_id = u.id
      WHERE u.id = p_user_id
    ),
    'engagement', (
      SELECT jsonb_build_object(
        'score', COALESCE(engagement_score, 0),
        'segment', COALESCE(segment, 'churned'),
        'active_days_30d', COALESCE(active_days_30d, 0),
        'categories_engaged', COALESCE(categories_engaged, 0)
      )
      FROM ml_analytics_user_engagement WHERE user_id = p_user_id
    ),
    'streak', (
      SELECT jsonb_build_object(
        'current', COALESCE(current_streak, 0),
        'longest', COALESCE(longest_streak, 0),
        'last_login', last_login_date
      )
      FROM miracle_learning_20260209_user_streaks WHERE user_id = p_user_id
    ),
    'learning', jsonb_build_object(
      'lessons_completed', (SELECT COUNT(*) FROM miracle_learning_20260209_user_lesson_progress WHERE user_id = p_user_id AND is_completed = true),
      'courses_started', (SELECT COUNT(DISTINCT course_id) FROM miracle_learning_20260209_user_lesson_progress WHERE user_id = p_user_id),
      'courses_completed', (SELECT COUNT(DISTINCT user_id) FROM miracle_learning_20260209_point_transactions WHERE user_id = p_user_id AND action_type = 'COURSE_100_PERCENT'),
      'avg_quiz_score', (SELECT COALESCE(ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END)), 0) FROM miracle_learning_20260209_user_answers WHERE user_id = p_user_id),
      'total_time_spent', (SELECT COALESCE(SUM(time_spent), 0) FROM miracle_learning_20260209_user_lesson_progress WHERE user_id = p_user_id)
    ),
    'community', jsonb_build_object(
      'discussions', (SELECT COUNT(*) FROM miracle_learning_20260209_discussions WHERE user_id = p_user_id AND status = 'active'),
      'comments', (SELECT COUNT(*) FROM miracle_learning_20260209_comments WHERE user_id = p_user_id AND is_deleted = false),
      'likes_received', (SELECT COUNT(*) FROM miracle_learning_20260209_likes l
        JOIN miracle_learning_20260209_discussions d ON l.target_type = 'discussion' AND l.target_id = d.id
        WHERE d.user_id = p_user_id)
    ),
    'recent_actions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'action_type', action_type, 'description', description,
        'created_at', created_at, 'points', points
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT action_type, description, created_at, points
        FROM miracle_learning_20260209_point_transactions
        WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 50
      ) sub
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 0.4g ml_analytics_engagement_distribution
DROP FUNCTION IF EXISTS public.ml_analytics_engagement_distribution();
CREATE OR REPLACE FUNCTION ml_analytics_engagement_distribution()
RETURNS JSONB AS $$
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('range', range, 'count', cnt) ORDER BY range), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN engagement_score < 10 THEN '0-10'
          WHEN engagement_score < 20 THEN '10-20'
          WHEN engagement_score < 30 THEN '20-30'
          WHEN engagement_score < 40 THEN '30-40'
          WHEN engagement_score < 50 THEN '40-50'
          WHEN engagement_score < 60 THEN '50-60'
          WHEN engagement_score < 70 THEN '60-70'
          WHEN engagement_score < 80 THEN '70-80'
          WHEN engagement_score < 90 THEN '80-90'
          ELSE '90-100'
        END AS range,
        COUNT(*) AS cnt
      FROM ml_analytics_user_engagement
      GROUP BY 1
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 0.4h ml_analytics_action_breakdown
DROP FUNCTION IF EXISTS public.ml_analytics_action_breakdown(INTEGER);
CREATE OR REPLACE FUNCTION ml_analytics_action_breakdown(
  p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'action_type', action_type, 'count', cnt, 'unique_users', users
    ) ORDER BY cnt DESC), '[]'::jsonb)
    FROM (
      SELECT action_type, COUNT(*) AS cnt, COUNT(DISTINCT user_id) AS users
      FROM miracle_learning_20260209_point_transactions
      WHERE created_at >= CURRENT_DATE - p_days
        AND action_type NOT IN ('BADGE_REWARD', 'SPEND')
      GROUP BY action_type
      ORDER BY cnt DESC LIMIT 15
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
