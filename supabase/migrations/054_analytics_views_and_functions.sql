-- =============================================================
-- 054: 用户行为深度分析系统
-- 3 个物化视图 + 8 个 RPC 函数 + 3 个性能索引
-- =============================================================

-- =============================================
-- 1a. 日活聚合物化视图
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS ml_analytics_daily_activity AS
WITH date_series AS (
  SELECT d::DATE AS activity_date
  FROM generate_series(
    (SELECT COALESCE(LEAST(MIN(created_at::date), CURRENT_DATE - 180), CURRENT_DATE - 180)
     FROM miracle_learning_20260209_point_transactions),
    CURRENT_DATE, '1 day'::interval
  ) AS d
),
new_user_counts AS (
  SELECT created_at::date AS reg_date, COUNT(*) AS cnt
  FROM miracle_learning_20260209_users
  WHERE role != 'admin'
  GROUP BY created_at::date
)
SELECT
  ds.activity_date,
  COUNT(DISTINCT pt.user_id) AS dau,
  COUNT(pt.id) AS total_actions,
  COUNT(DISTINCT pt.user_id) FILTER (WHERE pt.action_type IN (
    'LESSON_MARK_COMPLETE','COURSE_REVIEW','COURSE_QUESTION','COURSE_ANSWER',
    'COURSE_FEATURED','COURSE_NOTE','COURSE_MARATHON','COURSE_50_PERCENT',
    'COURSE_100_PERCENT','COURSE_REFLECTION','QUIZ_PERFECT','DAILY_REVIEW',
    'EASTER_EGG_FOUND','NOTE_UPLOAD','FEATURED_REPLY','QUALITY_COMMENT'
  )) AS learning_users,
  COUNT(DISTINCT pt.user_id) FILTER (WHERE pt.action_type IN (
    'WORKSHOP_CHECKIN','WORKSHOP_SUBMISSION','WORKSHOP_PREVIEW',
    'WORKSHOP_REALTIME','WORKSHOP_REVIEW','WORKSHOP_ITERATION',
    'WORKSHOP_TOP3','WORKSHOP_INSTRUCTOR','WORKSHOP_FEEDBACK',
    'WORKSHOP_FEEDBACK_QUALITY','WORKSHOP_INTERACTION'
  )) AS workshop_users,
  COUNT(DISTINCT pt.user_id) FILTER (WHERE pt.action_type IN (
    'DISCUSSION_POST','COMMENT','CREATE_DISCUSSION','DISCUSSION_LEAD',
    'TOPIC_LEADER','POPULAR_DISCUSSION','ARTICLE_READ','ARTICLE_READ_MONTHLY'
  )) AS community_users,
  COUNT(DISTINCT pt.user_id) FILTER (WHERE pt.action_type IN (
    'TOOL_EXPERIENCE','TOOL_RATING','TOOL_CASE','TOOL_COMPARISON',
    'TOOL_REVIEW','TOOL_SHARE'
  )) AS ai_tool_users,
  COALESCE(nu.cnt, 0) AS new_users
FROM date_series ds
LEFT JOIN miracle_learning_20260209_point_transactions pt
  ON pt.created_at::date = ds.activity_date
LEFT JOIN new_user_counts nu
  ON nu.reg_date = ds.activity_date
GROUP BY ds.activity_date, nu.cnt
ORDER BY ds.activity_date;

CREATE UNIQUE INDEX IF NOT EXISTS ml_idx_analytics_daily_date
  ON ml_analytics_daily_activity(activity_date);

-- =============================================
-- 1b. 月度留存物化视图
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS ml_analytics_cohort_retention AS
WITH cohorts AS (
  SELECT id AS user_id, date_trunc('month', created_at)::date AS cohort_month
  FROM miracle_learning_20260209_users WHERE role != 'admin'
),
activity AS (
  SELECT DISTINCT user_id, date_trunc('month', created_at)::date AS activity_month
  FROM miracle_learning_20260209_point_transactions
)
SELECT
  c.cohort_month,
  COALESCE(
    (EXTRACT(YEAR FROM a.activity_month)*12 + EXTRACT(MONTH FROM a.activity_month))
    - (EXTRACT(YEAR FROM c.cohort_month)*12 + EXTRACT(MONTH FROM c.cohort_month)),
    0
  )::int AS month_offset,
  COUNT(DISTINCT a.user_id) AS retained_users,
  MAX(sub.cohort_size) AS cohort_size
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id AND a.activity_month >= c.cohort_month
CROSS JOIN LATERAL (
  SELECT COUNT(*) AS cohort_size FROM cohorts c2 WHERE c2.cohort_month = c.cohort_month
) sub
WHERE a.activity_month IS NOT NULL
GROUP BY c.cohort_month, month_offset
ORDER BY c.cohort_month, month_offset;

CREATE UNIQUE INDEX IF NOT EXISTS ml_idx_analytics_cohort_pk
  ON ml_analytics_cohort_retention(cohort_month, month_offset);

-- =============================================
-- 1c. 用户参与度评分物化视图
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS ml_analytics_user_engagement AS
WITH user_metrics AS (
  SELECT
    u.id AS user_id,
    u.name,
    u.email,
    u.created_at AS registered_at,
    EXTRACT(DAY FROM NOW() - MAX(pt.created_at)) AS days_since_last_active,
    COUNT(DISTINCT pt.created_at::date)
      FILTER (WHERE pt.created_at >= CURRENT_DATE - 30) AS active_days_30d,
    COUNT(pt.id) FILTER (WHERE pt.created_at >= CURRENT_DATE - 30) AS actions_30d,
    (CASE WHEN COUNT(*) FILTER (WHERE pt.action_type IN (
      'LESSON_MARK_COMPLETE','COURSE_REVIEW','COURSE_QUESTION','COURSE_ANSWER',
      'COURSE_50_PERCENT','COURSE_100_PERCENT','QUIZ_PERFECT','DAILY_REVIEW',
      'NOTE_UPLOAD','COURSE_NOTE','COURSE_MARATHON','COURSE_REFLECTION',
      'EASTER_EGG_FOUND','FEATURED_REPLY','QUALITY_COMMENT')
      AND pt.created_at >= CURRENT_DATE - 30) > 0 THEN 1 ELSE 0 END +
     CASE WHEN COUNT(*) FILTER (WHERE pt.action_type IN (
      'WORKSHOP_CHECKIN','WORKSHOP_SUBMISSION','WORKSHOP_PREVIEW',
      'WORKSHOP_REVIEW','WORKSHOP_ITERATION','WORKSHOP_FEEDBACK',
      'WORKSHOP_REALTIME','WORKSHOP_TOP3','WORKSHOP_INSTRUCTOR',
      'WORKSHOP_FEEDBACK_QUALITY','WORKSHOP_INTERACTION')
      AND pt.created_at >= CURRENT_DATE - 30) > 0 THEN 1 ELSE 0 END +
     CASE WHEN COUNT(*) FILTER (WHERE pt.action_type IN (
      'DISCUSSION_POST','COMMENT','CREATE_DISCUSSION','DISCUSSION_LEAD',
      'TOPIC_LEADER','POPULAR_DISCUSSION','ARTICLE_READ','ARTICLE_READ_MONTHLY')
      AND pt.created_at >= CURRENT_DATE - 30) > 0 THEN 1 ELSE 0 END +
     CASE WHEN COUNT(*) FILTER (WHERE pt.action_type IN (
      'TOOL_EXPERIENCE','TOOL_RATING','TOOL_CASE','TOOL_COMPARISON',
      'TOOL_REVIEW','TOOL_SHARE')
      AND pt.created_at >= CURRENT_DATE - 30) > 0 THEN 1 ELSE 0 END +
     CASE WHEN COUNT(*) FILTER (WHERE pt.action_type IN (
      'DAILY_LOGIN','WEEKLY_STREAK','MONTHLY_STREAK','INVITE_USER',
      'PROFILE_COMPLETE','QUEST_ALL_COMPLETE','STREAK_100')
      AND pt.created_at >= CURRENT_DATE - 30) > 0 THEN 1 ELSE 0 END
    ) AS categories_engaged,
    COUNT(*) FILTER (WHERE pt.action_type = 'LESSON_MARK_COMPLETE') AS lessons_completed,
    COUNT(*) FILTER (WHERE pt.action_type = 'QUIZ_PERFECT') AS quizzes_aced,
    COUNT(*) FILTER (WHERE pt.action_type IN (
      'DISCUSSION_POST','COMMENT','CREATE_DISCUSSION')) AS community_actions,
    COUNT(*) FILTER (WHERE pt.action_type LIKE 'WORKSHOP_%') AS workshop_actions
  FROM miracle_learning_20260209_users u
  LEFT JOIN miracle_learning_20260209_point_transactions pt ON u.id = pt.user_id
  WHERE u.role != 'admin'
  GROUP BY u.id, u.name, u.email, u.created_at
)
SELECT
  user_id, name, email, registered_at,
  days_since_last_active, active_days_30d, actions_30d, categories_engaged,
  lessons_completed, quizzes_aced, community_actions, workshop_actions,
  ROUND((
    (categories_engaged::numeric / 5.0) * 100 * 0.35 +
    (LEAST(active_days_30d, 30)::numeric / 30.0) * 100 * 0.40 +
    LEAST(actions_30d::numeric / 50.0, 1.0) * 100 * 0.25
  ), 1) AS engagement_score,
  CASE
    WHEN active_days_30d >= 15 AND categories_engaged >= 3 THEN 'power'
    WHEN active_days_30d >= 5 AND actions_30d >= 15 THEN 'active'
    WHEN active_days_30d >= 1 THEN 'casual'
    WHEN days_since_last_active <= 60 THEN 'at_risk'
    ELSE 'churned'
  END AS segment
FROM user_metrics;

CREATE UNIQUE INDEX IF NOT EXISTS ml_idx_analytics_engagement_user
  ON ml_analytics_user_engagement(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_analytics_engagement_score
  ON ml_analytics_user_engagement(engagement_score DESC);
CREATE INDEX IF NOT EXISTS ml_idx_analytics_engagement_segment
  ON ml_analytics_user_engagement(segment);

-- =============================================
-- 1d. 性能索引
-- =============================================
CREATE INDEX IF NOT EXISTS ml_idx_pt_created_brin
  ON miracle_learning_20260209_point_transactions USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS ml_idx_pt_user_created_action
  ON miracle_learning_20260209_point_transactions (user_id, created_at DESC, action_type);

CREATE INDEX IF NOT EXISTS ml_idx_ulp_completed_at
  ON miracle_learning_20260209_user_lesson_progress (marked_complete_at DESC)
  WHERE is_completed = true;

-- =============================================
-- 1e. RPC: ml_analytics_overview
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_overview(
  p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_start DATE := CURRENT_DATE - p_days;
  v_prev_start DATE := CURRENT_DATE - (p_days * 2);
  v_prev_end DATE := CURRENT_DATE - p_days;
BEGIN
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

-- =============================================
-- 1f. RPC: ml_analytics_activity_trends
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_activity_trends(
  p_start_date DATE DEFAULT CURRENT_DATE - 30,
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
  activity_date DATE, dau BIGINT, total_actions BIGINT,
  learning_users BIGINT, workshop_users BIGINT,
  community_users BIGINT, ai_tool_users BIGINT, new_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT da.activity_date, da.dau, da.total_actions,
    da.learning_users, da.workshop_users,
    da.community_users, da.ai_tool_users, da.new_users
  FROM ml_analytics_daily_activity da
  WHERE da.activity_date BETWEEN p_start_date AND p_end_date
  ORDER BY da.activity_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 1g. RPC: ml_analytics_learning_funnel
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_learning_funnel(
  p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  v_start DATE := CURRENT_DATE - p_days;
  v_result JSONB;
BEGIN
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

-- =============================================
-- 1h. RPC: ml_analytics_user_segments
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_user_segments()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'segment', segment,
      'user_count', cnt,
      'avg_engagement_score', avg_score
    ) ORDER BY
      CASE segment WHEN 'power' THEN 1 WHEN 'active' THEN 2 WHEN 'casual' THEN 3 WHEN 'at_risk' THEN 4 ELSE 5 END
    ), '[]'::jsonb)
    FROM (
      SELECT segment, COUNT(*) AS cnt, ROUND(AVG(engagement_score), 1) AS avg_score
      FROM ml_analytics_user_engagement
      GROUP BY segment
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 1i. RPC: ml_analytics_content_stats
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_content_stats()
RETURNS TABLE(
  course_id UUID, course_title TEXT, total_lessons BIGINT,
  total_enrollments BIGINT, total_completions BIGINT,
  completion_rate NUMERIC, avg_time_per_lesson NUMERIC,
  total_questions BIGINT, total_reviews BIGINT
) AS $$
BEGIN
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

-- =============================================
-- 1j. RPC: ml_analytics_user_detail
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_user_detail(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
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
        'action_type', action_type,
        'description', description,
        'created_at', created_at,
        'points', points
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT action_type, description, created_at, points
        FROM miracle_learning_20260209_point_transactions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC LIMIT 50
      ) sub
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 1k. RPC: ml_analytics_engagement_distribution
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_engagement_distribution()
RETURNS JSONB AS $$
BEGIN
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

-- =============================================
-- 1l. RPC: ml_analytics_action_breakdown
-- =============================================
CREATE OR REPLACE FUNCTION ml_analytics_action_breakdown(
  p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'action_type', action_type,
      'count', cnt,
      'unique_users', users
    ) ORDER BY cnt DESC), '[]'::jsonb)
    FROM (
      SELECT action_type, COUNT(*) AS cnt, COUNT(DISTINCT user_id) AS users
      FROM miracle_learning_20260209_point_transactions
      WHERE created_at >= CURRENT_DATE - p_days
        AND action_type NOT IN ('BADGE_REWARD', 'SPEND')
      GROUP BY action_type
      ORDER BY cnt DESC
      LIMIT 15
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 1m. 权限
-- =============================================
GRANT SELECT ON ml_analytics_daily_activity TO authenticated;
GRANT SELECT ON ml_analytics_cohort_retention TO authenticated;
GRANT SELECT ON ml_analytics_user_engagement TO authenticated;

-- =============================================
-- 1n. pg_cron 刷新调度（需在 Supabase Dashboard 手动执行）
-- =============================================
-- SELECT cron.schedule('ml-refresh-analytics-hourly', '5 * * * *',
--   $$REFRESH MATERIALIZED VIEW CONCURRENTLY ml_analytics_daily_activity$$);
-- SELECT cron.schedule('ml-refresh-engagement-6h', '0 */6 * * *',
--   $$REFRESH MATERIALIZED VIEW CONCURRENTLY ml_analytics_user_engagement$$);
-- SELECT cron.schedule('ml-refresh-cohort-daily', '0 3 * * *',
--   $$REFRESH MATERIALIZED VIEW CONCURRENTLY ml_analytics_cohort_retention$$);
