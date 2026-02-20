-- =============================================================
-- 055: Performance Optimization RPCs
-- 3 new RPC functions to reduce round trips:
--   1. ml_get_comments_with_replies — single query for comments + nested replies + user data
--   2. ml_get_leaderboard_fallback — efficient fallback when materialized view unavailable
--   3. ml_get_last_learned_lesson — single query for "continue learning" card
-- =============================================================

-- =============================================================
-- 1. Comments with nested replies (replaces 2-query pattern)
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_get_comments_with_replies(
  p_target_type TEXT,
  p_target_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_reply_limit INT DEFAULT 3,
  p_sort TEXT DEFAULT 'newest'
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_col TEXT;
  v_order_dir TEXT;
BEGIN
  -- Validate sort parameter to prevent SQL injection
  CASE p_sort
    WHEN 'oldest' THEN v_order_col := 'created_at'; v_order_dir := 'ASC';
    WHEN 'popular' THEN v_order_col := 'like_count'; v_order_dir := 'DESC';
    ELSE v_order_col := 'created_at'; v_order_dir := 'DESC'; -- newest (default)
  END CASE;

  RETURN (
    SELECT COALESCE(jsonb_agg(comment_row), '[]'::jsonb)
    FROM (
      SELECT
        c.id, c.user_id, c.content, c.like_count, c.parent_id, c.created_at,
        jsonb_build_object(
          'id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url
        ) AS "user",
        (SELECT COUNT(*) FROM miracle_learning_20260209_comments r
         WHERE r.parent_id = c.id AND r.is_deleted = FALSE) AS reply_count,
        COALESCE((
          SELECT jsonb_agg(reply_row ORDER BY reply_row.created_at ASC)
          FROM (
            SELECT
              r.id, r.user_id, r.content, r.like_count, r.parent_id, r.created_at,
              jsonb_build_object(
                'id', ru.id, 'name', ru.name, 'email', ru.email, 'avatar_url', ru.avatar_url
              ) AS "user"
            FROM miracle_learning_20260209_comments r
            JOIN miracle_learning_20260209_users ru ON ru.id = r.user_id
            WHERE r.parent_id = c.id AND r.is_deleted = FALSE
            ORDER BY r.created_at ASC
            LIMIT p_reply_limit
          ) reply_row
        ), '[]'::jsonb) AS replies
      FROM miracle_learning_20260209_comments c
      JOIN miracle_learning_20260209_users u ON u.id = c.user_id
      WHERE c.target_type = p_target_type
        AND c.target_id = p_target_id
        AND c.parent_id IS NULL
        AND c.is_deleted = FALSE
      ORDER BY
        CASE WHEN v_order_col = 'like_count' THEN c.like_count END DESC,
        CASE WHEN v_order_col = 'created_at' AND v_order_dir = 'DESC' THEN c.created_at END DESC,
        CASE WHEN v_order_col = 'created_at' AND v_order_dir = 'ASC' THEN c.created_at END ASC,
        c.id  -- tie-breaker: 确保确定性排序，避免分页重复/遗漏
      LIMIT p_limit OFFSET p_offset
    ) comment_row
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_get_comments_with_replies(TEXT, UUID, INT, INT, INT, TEXT) TO authenticated;

-- =============================================================
-- 2. Leaderboard fallback (replaces multi-join + in-memory sort)
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_get_leaderboard_fallback(p_limit INT DEFAULT 20)
RETURNS TABLE(
  id UUID,
  name TEXT,
  avatar_url TEXT,
  total_points INT,
  level INT,
  current_streak INT,
  badge_count BIGINT,
  rank BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    u.id,
    u.name,
    u.avatar_url,
    COALESCE(b.total_points, 0) AS total_points,
    COALESCE(b.level, 1) AS level,
    COALESCE(s.current_streak, 0) AS current_streak,
    COALESCE(bc.badge_count, 0) AS badge_count,
    DENSE_RANK() OVER (ORDER BY COALESCE(b.total_points, 0) DESC) AS rank
  FROM miracle_learning_20260209_users u
  LEFT JOIN miracle_learning_20260209_user_point_balance b ON u.id = b.user_id
  LEFT JOIN miracle_learning_20260209_user_streaks s ON u.id = s.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS badge_count
    FROM miracle_learning_20260209_user_badges
    GROUP BY user_id
  ) bc ON u.id = bc.user_id
  WHERE u.role != 'admin' AND COALESCE(b.total_points, 0) > 0
  ORDER BY COALESCE(b.total_points, 0) DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.ml_get_leaderboard_fallback(INT) TO authenticated;

-- =============================================================
-- 3. Last learned lesson (replaces 3-query pattern)
-- =============================================================
CREATE OR REPLACE FUNCTION public.ml_get_last_learned_lesson(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 鉴权：仅允许查询自己的学习进度
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'lessonId', l.id,
      'lessonTitle', l.title,
      'chapterTitle', ch.title,
      'courseId', co.id,
      'courseTitle', co.title,
      'courseCoverImage', co.cover_image,
      'updatedAt', p.updated_at
    )
    FROM miracle_learning_20260209_user_lesson_progress p
    JOIN miracle_learning_20260209_lessons l ON l.id = p.lesson_id
    JOIN miracle_learning_20260209_chapters ch ON ch.id = l.chapter_id
    JOIN miracle_learning_20260209_courses co ON co.id = ch.course_id
    WHERE p.user_id = p_user_id AND p.marked_complete_at IS NULL
    ORDER BY p.updated_at DESC
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_get_last_learned_lesson(UUID) TO authenticated;
