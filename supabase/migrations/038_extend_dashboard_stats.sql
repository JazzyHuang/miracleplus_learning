-- ============================================================
-- Migration 038: 扩展 ml_get_user_dashboard_stats RPC
--
-- 替换 migration 037 中的版本，添加缺失字段以完全替代
-- getUserLearningStatsInternal 中的 7 个并行查询
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
    -- 用户创建时间（计算学习天数）
    SELECT created_at INTO v_created_at
    FROM miracle_learning_20260209_users WHERE id = p_user_id;

    IF v_created_at IS NOT NULL THEN
        v_learning_days := GREATEST(1, EXTRACT(DAY FROM NOW() - v_created_at)::INTEGER + 1);
    END IF;

    -- 完成的课时数
    SELECT COUNT(*) INTO v_completed_lessons
    FROM miracle_learning_20260209_user_lesson_progress
    WHERE user_id = p_user_id AND is_completed = true;

    -- 测试答题统计（合并为单次查询）
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true)
    INTO v_quiz_total, v_quiz_correct
    FROM miracle_learning_20260209_user_answers
    WHERE user_id = p_user_id;

    -- 活动打卡数
    SELECT COUNT(*) INTO v_workshop_checkins
    FROM miracle_learning_20260209_workshop_checkins
    WHERE user_id = p_user_id;

    -- 全局：总课时数
    SELECT COUNT(*) INTO v_total_lessons
    FROM miracle_learning_20260209_lessons;

    -- 全局：活跃活动数
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

COMMENT ON FUNCTION public.ml_get_user_dashboard_stats IS '获取用户仪表板统计数据 - 一次调用获取所有统计信息，替代 7 个并行查询';

GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.ml_get_user_dashboard_stats TO anon;
