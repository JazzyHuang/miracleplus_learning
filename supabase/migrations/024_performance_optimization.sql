-- =====================================================
-- 性能优化迁移 - 基于深度代码审查
-- 创建日期: 2026-02-07
--
-- 针对 getUserLearningStats 和 getUserCourseProgress 的查询优化
-- =====================================================

-- user_answers 表：正确率查询优化
-- getUserLearningStats 中 SELECT is_correct FROM user_answers WHERE user_id = ?
CREATE INDEX IF NOT EXISTS ml_idx_user_answers_user_correct
ON public.miracle_learning_20260209_user_answers(user_id, is_correct);

-- user_lesson_progress 表：已完成课时计数优化
-- getUserLearningStats 和 getUserCourseProgress 中频繁使用
CREATE INDEX IF NOT EXISTS ml_idx_user_lesson_progress_completed
ON public.miracle_learning_20260209_user_lesson_progress(user_id, is_completed)
WHERE is_completed = true;

-- user_point_balance 表：排行榜查询优化
-- MiniLeaderboard 的 getLeaderboard 查询
CREATE INDEX IF NOT EXISTS ml_idx_user_point_balance_total
ON public.miracle_learning_20260209_user_point_balance(total_points DESC);

-- workshop_checkins 表：用户打卡计数优化
CREATE INDEX IF NOT EXISTS ml_idx_workshop_checkins_user
ON public.miracle_learning_20260209_workshop_checkins(user_id);

-- ==================== 合并查询函数 ====================
-- 将 getUserCourseProgress 的两步查询合并为一个数据库函数
-- 避免应用层的串行查询

-- 001 中已创建该函数但返回类型不同，需先 DROP 再重建
DROP FUNCTION IF EXISTS ml_get_user_course_progress(UUID, UUID);

CREATE OR REPLACE FUNCTION ml_get_user_course_progress(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS TABLE (
  completed_lessons BIGINT,
  total_lessons BIGINT,
  percentage INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_completed BIGINT;
BEGIN
  -- 获取课程总课时数
  SELECT COUNT(l.id) INTO v_total
  FROM miracle_learning_20260209_lessons l
  JOIN miracle_learning_20260209_chapters c ON c.id = l.chapter_id
  WHERE c.course_id = p_course_id;

  -- 获取用户已完成的课时数
  SELECT COUNT(ulp.id) INTO v_completed
  FROM miracle_learning_20260209_user_lesson_progress ulp
  JOIN miracle_learning_20260209_lessons l ON l.id = ulp.lesson_id
  JOIN miracle_learning_20260209_chapters c ON c.id = l.chapter_id
  WHERE ulp.user_id = p_user_id
    AND ulp.is_completed = true
    AND c.course_id = p_course_id;

  RETURN QUERY SELECT
    v_completed,
    v_total,
    CASE WHEN v_total > 0
      THEN (v_completed * 100 / v_total)::INTEGER
      ELSE 0
    END;
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION ml_get_user_course_progress TO authenticated;

COMMENT ON FUNCTION ml_get_user_course_progress IS '获取用户课程进度（合并查询优化，替代应用层两步查询）';
