-- ============================================================
-- 第二阶段：性能优化 - 消除 N+1 查询
-- Migration: 037_performance_optimization_n1.sql
--
-- 此迁移创建优化的数据库函数来消除 N+1 查询问题
-- ============================================================

-- 1. 创建用户仪表板统计 RPC 函数
-- 合并多个查询为单个函数调用，减少网络往返
CREATE OR REPLACE FUNCTION public.ml_get_user_dashboard_stats(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_points INTEGER DEFAULT 0;
    v_level INTEGER DEFAULT 1;
    v_streak INTEGER DEFAULT 0;
    v_courses_completed INTEGER DEFAULT 0;
    v_courses_total INTEGER DEFAULT 0;
    v_lessons_completed INTEGER DEFAULT 0;
    v_workshops_attended INTEGER DEFAULT 0;
    v_badges_count INTEGER DEFAULT 0;
    v_result JSON;
BEGIN
    -- 获取用户积分和等级
    SELECT
        COALESCE(total_points, 0),
        COALESCE(level, 1)
    INTO v_points, v_level
    FROM public.miracle_learning_20260209_user_point_balance
    WHERE user_id = p_user_id;

    -- 获取用户连续登录天数
    SELECT COALESCE(current_streak, 0)
    INTO v_streak
    FROM public.miracle_learning_20260209_user_streaks
    WHERE user_id = p_user_id;

    -- 获取完成的课程数
    SELECT COUNT(DISTINCT course_id)
    INTO v_courses_completed
    FROM public.miracle_learning_20260209_user_lesson_progress
    WHERE user_id = p_user_id
      AND marked_complete_at IS NOT NULL;

    -- 获取总课程数（已发布）
    SELECT COUNT(*)
    INTO v_courses_total
    FROM public.miracle_learning_20260209_courses
    WHERE is_published = true;

    -- 获取完成的课时数
    SELECT COUNT(*)
    INTO v_lessons_completed
    FROM public.miracle_learning_20260209_user_lesson_progress
    WHERE user_id = p_user_id
      AND marked_complete_at IS NOT NULL;

    -- 获取参加的工坊数
    SELECT COUNT(*)
    INTO v_workshops_attended
    FROM public.miracle_learning_20260209_workshop_checkins
    WHERE user_id = p_user_id;

    -- 获取徽章数
    SELECT COUNT(*)
    INTO v_badges_count
    FROM public.miracle_learning_20260209_user_badges
    WHERE user_id = p_user_id;

    -- 构建结果 JSON
    v_result := json_build_object(
        'points', v_points,
        'level', v_level,
        'streak', v_streak,
        'courses_completed', v_courses_completed,
        'courses_total', v_courses_total,
        'lessons_completed', v_lessons_completed,
        'workshops_attended', v_workshops_attended,
        'badges_count', v_badges_count
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.ml_get_user_dashboard_stats IS '获取用户仪表板统计数据 - 一次调用获取所有统计信息，避免 N+1 查询';

-- 2. 添加缺失的复合索引以优化查询性能

-- 用户课程进度复合索引
CREATE INDEX IF NOT EXISTS ml_idx_user_progress_user_course_complete
ON public.miracle_learning_20260209_user_lesson_progress(user_id, course_id, marked_complete_at)
WHERE marked_complete_at IS NOT NULL;

-- 讨论帖查看计数索引
CREATE INDEX IF NOT EXISTS ml_idx_discussions_view_count
ON public.miracle_learning_20260209_discussions(status, created_at DESC)
WHERE status = 'active';

-- AI 工具平均评分索引
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_avg_rating
ON public.miracle_learning_20260209_ai_tools(avg_rating DESC, rating_count)
WHERE is_published = true;

-- 工作坊时间索引
CREATE INDEX IF NOT EXISTS ml_idx_workshops_event_date
ON public.miracle_learning_20260209_workshops(event_date DESC)
WHERE is_active = true;

-- 3. 授权执行权限
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats TO service_role;

-- ============================================================
-- 验证脚本
-- ============================================================

-- 测试用户仪表板统计函数
-- SELECT * FROM ml_get_user_dashboard_stats('user-uuid-here');
