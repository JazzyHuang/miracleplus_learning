-- RLS 辅助函数
-- 用于优化 RLS 策略性能，减少重复子查询
-- 创建日期: 2026-01-27

-- ==================== 管理员检查函数 ====================
-- 使用 STABLE SECURITY DEFINER 确保函数可以正确检查权限
-- 缓存结果以提高性能（STABLE 表示同一事务内结果不变）

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- 检查用户是否为管理员
  -- 通过查询 users 表的 role 字段
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 添加函数注释
COMMENT ON FUNCTION public.is_admin() IS '检查当前用户是否为管理员。用于 RLS 策略中，避免重复的子查询。使用 STABLE 修饰符确保同一事务内缓存结果。';

-- ==================== 用户身份检查函数 ====================
-- 检查当前用户是否为指定用户

CREATE OR REPLACE FUNCTION public.is_current_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = target_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_current_user(UUID) IS '检查当前登录用户是否为指定用户。用于 RLS 策略中的用户自身数据访问检查。';

-- ==================== 用户存在检查函数 ====================
-- 检查用户是否已认证（已登录）

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_authenticated() IS '检查用户是否已认证（已登录）。用于 RLS 策略中的基础认证检查。';

-- ==================== 授予函数执行权限 ====================
-- 授予已认证用户执行这些函数的权限

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;

-- ==================== 更新现有 RLS 策略以使用新函数 ====================
-- 注意：这里只更新部分策略作为示例，实际应用中应逐步迁移

-- 更新 user_lesson_progress 表的管理员策略
DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_lesson_progress;
CREATE POLICY "Admins can view all progress" ON public.user_lesson_progress
  FOR SELECT USING (public.is_admin());

-- 更新 user_answers 表的管理员策略
DROP POLICY IF EXISTS "Admins can view all answers" ON public.user_answers;
CREATE POLICY "Admins can view all answers" ON public.user_answers
  FOR SELECT USING (public.is_admin());

-- 更新 workshop_checkins 表的管理员策略
DROP POLICY IF EXISTS "Admins can delete any checkin" ON public.workshop_checkins;
CREATE POLICY "Admins can delete any checkin" ON public.workshop_checkins
  FOR DELETE USING (public.is_admin());

-- 更新 users 表的管理员策略
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());
