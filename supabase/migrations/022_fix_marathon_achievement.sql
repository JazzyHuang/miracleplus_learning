-- =====================================================
-- 修复马拉松成就查询逻辑
-- 
-- 问题：原 mark_lesson_complete 函数中的马拉松成就查询
--       统计的是所有课程中今天完成的课时，但里程碑是按课程存储的。
--       这允许用户通过跨课程完成课时来获得多个马拉松成就。
-- 
-- 修复：将查询限制为只统计当前课程今天完成的课时。
-- 
-- 创建日期: 2026-01-29
-- =====================================================

-- 删除旧函数并重新创建
DROP FUNCTION IF EXISTS public.mark_lesson_complete(UUID, UUID, UUID);

CREATE FUNCTION public.mark_lesson_complete(
  p_user_id UUID,
  p_lesson_id UUID,
  p_course_id UUID
) RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_points_earned INTEGER := 0;
  v_milestone_unlocked TEXT := NULL;
  v_already_completed BOOLEAN;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_progress_percentage NUMERIC;
  v_today_completed INTEGER;
BEGIN
  -- 权限检查
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- 检查是否已完成
  SELECT EXISTS (
    SELECT 1 FROM user_lesson_progress
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND is_completed = TRUE
  ) INTO v_already_completed;
  
  IF v_already_completed THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'points_earned', 0,
      'milestone', null
    );
  END IF;
  
  -- 插入或更新进度记录
  INSERT INTO user_lesson_progress (user_id, lesson_id, course_id, is_completed, marked_complete_at)
  VALUES (p_user_id, p_lesson_id, p_course_id, TRUE, NOW())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET is_completed = TRUE,
      marked_complete_at = NOW();
  
  -- 发放完成积分
  v_points_earned := public.add_user_points(
    p_user_id, 
    50, 
    'LESSON_MARK_COMPLETE', 
    p_lesson_id, 
    'lesson', 
    '完成课时'
  );
  
  -- 计算课程进度
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons l
  JOIN chapters c ON l.chapter_id = c.id
  WHERE c.course_id = p_course_id;
  
  SELECT COUNT(*) INTO v_completed_lessons
  FROM user_lesson_progress ulp
  JOIN lessons l ON ulp.lesson_id = l.id
  JOIN chapters c ON l.chapter_id = c.id
  WHERE ulp.user_id = p_user_id
    AND c.course_id = p_course_id
    AND ulp.is_completed = TRUE;
  
  IF v_total_lessons > 0 THEN
    v_progress_percentage := (v_completed_lessons::NUMERIC / v_total_lessons) * 100;
    
    -- 检查 50% 里程碑
    IF v_progress_percentage >= 50 THEN
      INSERT INTO course_milestones (user_id, course_id, milestone_type)
      VALUES (p_user_id, p_course_id, '50_percent')
      ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      
      -- 如果是首次达到，发放积分
      IF FOUND THEN
        v_points_earned := v_points_earned + public.add_user_points(
          p_user_id, 100, 'COURSE_50_PERCENT', p_course_id, 'course', '课程完成 50%'
        );
        v_milestone_unlocked := '50_percent';
      END IF;
    END IF;
    
    -- 检查 100% 里程碑
    IF v_progress_percentage >= 100 THEN
      INSERT INTO course_milestones (user_id, course_id, milestone_type)
      VALUES (p_user_id, p_course_id, '100_percent')
      ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      
      IF FOUND THEN
        v_points_earned := v_points_earned + public.add_user_points(
          p_user_id, 300, 'COURSE_100_PERCENT', p_course_id, 'course', '课程完成 100%'
        );
        v_milestone_unlocked := '100_percent';
      END IF;
    END IF;
  END IF;
  
  -- 修复：检查马拉松成就（一天内在【同一门课程】完成 3 节课）
  -- 原逻辑错误地统计了所有课程的完成数，导致可以跨课程获得多个马拉松成就
  SELECT COUNT(*) INTO v_today_completed
  FROM user_lesson_progress
  WHERE user_id = p_user_id
    AND course_id = p_course_id  -- 添加课程过滤条件
    AND marked_complete_at >= CURRENT_DATE
    AND is_completed = TRUE;
  
  IF v_today_completed >= 3 THEN
    INSERT INTO course_milestones (user_id, course_id, milestone_type)
    VALUES (p_user_id, p_course_id, 'marathon')
    ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
    
    IF FOUND THEN
      v_points_earned := v_points_earned + public.add_user_points(
        p_user_id, 100, 'COURSE_MARATHON', p_course_id, 'course', '马拉松成就'
      );
      IF v_milestone_unlocked IS NULL THEN
        v_milestone_unlocked := 'marathon';
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'already_completed', false,
    'points_earned', v_points_earned,
    'milestone', v_milestone_unlocked,
    'progress', jsonb_build_object(
      'completed', v_completed_lessons,
      'total', v_total_lessons,
      'percentage', ROUND(v_progress_percentage, 2)
    )
  );
END;
$$ LANGUAGE plpgsql;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.mark_lesson_complete(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_lesson_complete IS '标记课时完成，自动处理积分发放和里程碑检查。马拉松成就要求在同一天内完成同一门课程的 3 节课。';
