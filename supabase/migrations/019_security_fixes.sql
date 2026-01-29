-- =====================================================
-- 安全漏洞修复迁移
-- 修复内容：
-- 1. add_user_points 函数权限漏洞 - 添加调用者身份验证
-- 2. check_email_exists 邮箱枚举漏洞 - 移除 anon 执行权限
-- 3. 补全缺失的 RLS 策略
-- 4. 添加 course_milestones 表
-- 5. 添加 mark_lesson_complete 函数
-- 创建日期: 2026-01-29
-- 
-- 注意：此迁移文件设计为可重复执行（幂等性）
-- =====================================================

-- ==================== 1. 修复 add_user_points 函数权限漏洞 ====================
-- 问题：任意已认证用户可以为其他用户添加积分
-- 修复：添加调用者身份验证，只有本人或管理员可以操作

-- 先删除旧函数（如果存在且签名不同会导致 CREATE OR REPLACE 失败）
DROP FUNCTION IF EXISTS public.add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT);

CREATE FUNCTION public.add_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_total INTEGER;
  v_daily_limit INTEGER;
  v_new_balance INTEGER;
  v_actual_points INTEGER;
  v_caller_id UUID;
BEGIN
  -- 获取调用者 ID
  v_caller_id := auth.uid();
  
  -- 权限检查：必须是本人或管理员
  -- 允许系统调用（auth.uid() 为 NULL 时，通常是触发器或内部函数调用）
  IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
    -- 检查是否是管理员
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permission denied: cannot add points to other users';
    END IF;
  END IF;
  
  -- 如果积分为0或负数（消费），直接处理
  IF p_points <= 0 THEN
    v_actual_points := p_points;
  ELSE
    -- 获取该行为的每日上限
    SELECT daily_limit INTO v_daily_limit
    FROM point_rules
    WHERE action_type = p_action_type AND is_active = TRUE;
    
    -- 检查每日积分上限（总体上限300分）
    SELECT COALESCE(SUM(points), 0) INTO v_daily_total
    FROM point_transactions
    WHERE user_id = p_user_id 
      AND points > 0
      AND created_at >= CURRENT_DATE;
    
    -- 应用总体每日上限
    IF v_daily_total >= 300 THEN
      RETURN 0;  -- 已达每日上限
    END IF;
    
    v_actual_points := LEAST(p_points, 300 - v_daily_total);
    
    -- 如果有行为特定的每日上限，检查该行为今日次数
    IF v_daily_limit IS NOT NULL THEN
      DECLARE
        v_action_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_action_count
        FROM point_transactions
        WHERE user_id = p_user_id 
          AND action_type = p_action_type
          AND created_at >= CURRENT_DATE;
        
        IF v_action_count >= v_daily_limit THEN
          RETURN 0;  -- 该行为已达每日上限
        END IF;
      END;
    END IF;
  END IF;
  
  IF v_actual_points = 0 THEN
    RETURN 0;
  END IF;
  
  -- 插入流水记录
  INSERT INTO point_transactions (user_id, points, action_type, reference_id, reference_type, description)
  VALUES (p_user_id, v_actual_points, p_action_type, p_reference_id, p_reference_type, p_description);
  
  -- 原子更新余额（使用 UPSERT）
  INSERT INTO user_point_balance (user_id, total_points, available_points, updated_at)
  VALUES (
    p_user_id, 
    GREATEST(0, v_actual_points), 
    GREATEST(0, v_actual_points), 
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_points = CASE 
      WHEN v_actual_points > 0 THEN user_point_balance.total_points + v_actual_points
      ELSE user_point_balance.total_points
    END,
    available_points = user_point_balance.available_points + v_actual_points,
    spent_points = CASE 
      WHEN v_actual_points < 0 THEN user_point_balance.spent_points + ABS(v_actual_points)
      ELSE user_point_balance.spent_points
    END,
    updated_at = NOW()
  RETURNING available_points INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated;

-- 更新函数注释
COMMENT ON FUNCTION public.add_user_points IS '原子性添加用户积分，自动处理每日上限。仅允许本人或管理员调用。';

-- ==================== 2. 修复邮箱枚举漏洞 ====================
-- 问题：匿名用户可以枚举已注册邮箱
-- 修复：移除 anon 用户的执行权限，添加延迟响应

-- 移除 anon 用户的执行权限（忽略不存在的情况）
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.check_email_exists(TEXT) FROM anon;
EXCEPTION
  WHEN undefined_function THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 先删除旧函数
DROP FUNCTION IF EXISTS public.check_email_exists(TEXT);

-- 重新创建函数，添加延迟响应防止时序攻击
CREATE FUNCTION public.check_email_exists(target_email TEXT)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- 检查 public.users 表中是否存在该邮箱
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = target_email
  ) INTO v_exists;
  
  -- 添加小延迟防止时序攻击（50-100ms 随机延迟）
  PERFORM pg_sleep(0.05 + random() * 0.05);
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql STABLE;

-- 仅授予已认证用户执行权限
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated;

-- ==================== 3. 添加 course_milestones 表 ====================
-- 用于记录用户在课程中达到的里程碑

CREATE TABLE IF NOT EXISTS public.course_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,  -- '50_percent', '100_percent', 'marathon'
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, course_id, milestone_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_course_milestones_user_course 
ON public.course_milestones(user_id, course_id);

-- 启用 RLS
ALTER TABLE public.course_milestones ENABLE ROW LEVEL SECURITY;

-- RLS 策略（先删除可能存在的策略，避免重复创建错误）
DROP POLICY IF EXISTS "Users can view their own milestones" ON public.course_milestones;
CREATE POLICY "Users can view their own milestones" ON public.course_milestones
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert milestones" ON public.course_milestones;
CREATE POLICY "System can insert milestones" ON public.course_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admins can manage milestones" ON public.course_milestones;
CREATE POLICY "Admins can manage milestones" ON public.course_milestones
  FOR ALL USING (public.is_admin());

-- 授予权限
GRANT SELECT ON public.course_milestones TO authenticated;
GRANT INSERT ON public.course_milestones TO authenticated;

-- ==================== 4. 添加 mark_lesson_complete 函数 ====================
-- 标记课时完成，处理积分发放和里程碑检查

-- 先删除旧函数（可能存在不同返回类型的版本）
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
  
  -- 检查马拉松成就（一天完成 3 节课）
  SELECT COUNT(*) INTO v_today_completed
  FROM user_lesson_progress
  WHERE user_id = p_user_id
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

COMMENT ON FUNCTION public.mark_lesson_complete IS '标记课时完成，自动处理积分发放和里程碑检查';

-- ==================== 5. 补全缺失的 RLS 策略 ====================

-- user_lesson_progress 表添加 DELETE 策略
DROP POLICY IF EXISTS "Admins can delete progress" ON public.user_lesson_progress;
CREATE POLICY "Admins can delete progress" ON public.user_lesson_progress
  FOR DELETE USING (public.is_admin());

-- 移除 is_admin() 对 anon 的执行权限（防止信息泄露）
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
EXCEPTION
  WHEN undefined_function THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ==================== 6. 添加缺失的积分规则类型 ====================
INSERT INTO public.point_rules (action_type, points, daily_limit, description) VALUES
  ('BADGE_REWARD', 0, NULL, '勋章解锁奖励（积分由勋章定义）'),
  ('SPEND', 0, NULL, '积分消费'),
  ('CREATE_DISCUSSION', 20, 5, '创建讨论话题'),
  ('INVITE_COMPLETE', 80, NULL, '邀请用户完成注册'),
  ('POPULAR_DISCUSSION', 50, NULL, '讨论成为热门')
ON CONFLICT (action_type) DO NOTHING;

-- ==================== 添加注释 ====================
COMMENT ON TABLE public.course_milestones IS '用户课程里程碑记录表';
