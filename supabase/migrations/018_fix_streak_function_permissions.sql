-- =====================================================
-- 修复连续登录函数权限问题
-- 问题：update_user_streak 函数需要 SECURITY DEFINER 来确保有足够权限
--       执行内部的 INSERT/UPDATE 操作
-- 创建日期: 2026-01-29
-- =====================================================

-- ==================== 重新创建连续登录更新函数 ====================
-- 使用 SECURITY DEFINER 使函数以定义者（postgres）的权限运行
-- 这样可以绕过 RLS 策略，确保函数能正常执行
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  points_earned INTEGER,
  badge_unlocked TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_login DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_points_earned INTEGER := 0;
  v_badge_unlocked TEXT := NULL;
BEGIN
  -- 验证调用者只能更新自己的 streak
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied: can only update own streak';
  END IF;

  -- 获取或创建用户 streak 记录
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_login_date, streak_start_date)
  VALUES (p_user_id, 0, 0, NULL, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT us.last_login_date, us.current_streak, us.longest_streak
  INTO v_last_login, v_current_streak, v_longest_streak
  FROM user_streaks us
  WHERE us.user_id = p_user_id;
  
  -- 如果今天已经登录过，不重复计算
  IF v_last_login = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, 0, NULL::TEXT;
    RETURN;
  END IF;
  
  -- 计算连续登录
  IF v_last_login IS NULL OR v_last_login < v_today - 1 THEN
    -- 断签或首次登录，重新开始
    v_current_streak := 1;
    
    UPDATE user_streaks
    SET current_streak = 1,
        last_login_date = v_today,
        streak_start_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- 连续登录
    v_current_streak := v_current_streak + 1;
    
    -- 更新最长记录
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    
    UPDATE user_streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_login_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- 发放每日登录积分
  v_points_earned := public.add_user_points(p_user_id, 5, 'DAILY_LOGIN', NULL, NULL, '每日登录奖励');
  
  -- 检查里程碑奖励
  IF v_current_streak = 7 THEN
    v_points_earned := v_points_earned + public.add_user_points(p_user_id, 50, 'WEEKLY_STREAK', NULL, NULL, '连续登录7天奖励');
    v_badge_unlocked := 'STREAK_7';
  ELSIF v_current_streak = 30 THEN
    v_points_earned := v_points_earned + public.add_user_points(p_user_id, 200, 'MONTHLY_STREAK', NULL, NULL, '连续登录30天奖励');
    v_badge_unlocked := 'STREAK_30';
  ELSIF v_current_streak = 100 THEN
    v_points_earned := v_points_earned + public.add_user_points(p_user_id, 500, 'STREAK_100', NULL, NULL, '连续登录100天奖励');
    v_badge_unlocked := 'STREAK_100';
  END IF;
  
  -- 解锁勋章（如果有）
  IF v_badge_unlocked IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT p_user_id, b.id
    FROM badges b
    WHERE b.code = v_badge_unlocked
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_points_earned, v_badge_unlocked;
END;
$$ LANGUAGE plpgsql;

-- ==================== 同样修复 add_user_points 函数 ====================
-- 确保积分添加函数也有正确的权限
CREATE OR REPLACE FUNCTION public.add_user_points(
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
BEGIN
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

-- ==================== 确保函数执行权限 ====================
GRANT EXECUTE ON FUNCTION public.add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_streak(UUID) TO authenticated;

-- ==================== 添加注释 ====================
COMMENT ON FUNCTION public.add_user_points IS '原子性添加用户积分，自动处理每日上限（SECURITY DEFINER）';
COMMENT ON FUNCTION public.update_user_streak IS '更新用户连续登录记录并发放相应奖励（SECURITY DEFINER）';
