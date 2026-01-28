-- 修复表级别权限问题
-- 问题：用户无法访问 users 表，即使 RLS 策略正确
-- 错误：permission denied for table users (42501)
-- 原因：缺少对 authenticated 和 anon 角色的基本表权限授予
-- 创建日期: 2026-01-28

-- ==================== 授予 users 表权限 ====================
-- 认证用户可以 SELECT, INSERT, UPDATE 自己的记录
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- 匿名用户不需要访问 users 表（可选，根据需求）
-- GRANT SELECT ON public.users TO anon;

-- ==================== 确保 RLS 已启用 ====================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ==================== 重新创建 users 表 RLS 策略 ====================
-- 先删除可能存在的旧策略，避免冲突
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- 用户可以查看自己的 profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的 profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 用户可以插入自己的 profile（用于首次创建）
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 管理员可以查看所有用户
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- ==================== 授予其他相关表权限 ====================

-- workshops 表
GRANT SELECT ON public.workshops TO authenticated;
GRANT SELECT ON public.workshops TO anon;
GRANT INSERT, UPDATE, DELETE ON public.workshops TO authenticated;

-- workshop_checkins 表
GRANT SELECT, INSERT, DELETE ON public.workshop_checkins TO authenticated;
GRANT SELECT ON public.workshop_checkins TO anon;

-- courses 表
GRANT SELECT ON public.courses TO authenticated;
GRANT SELECT ON public.courses TO anon;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;

-- chapters 表
GRANT SELECT ON public.chapters TO authenticated;
GRANT SELECT ON public.chapters TO anon;
GRANT INSERT, UPDATE, DELETE ON public.chapters TO authenticated;

-- lessons 表
GRANT SELECT ON public.lessons TO authenticated;
GRANT SELECT ON public.lessons TO anon;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;

-- questions 表
GRANT SELECT ON public.questions TO authenticated;
GRANT SELECT ON public.questions TO anon;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;

-- user_answers 表
GRANT SELECT, INSERT ON public.user_answers TO authenticated;

-- ==================== 授予积分系统表权限 ====================

-- 积分相关表（如果存在）
DO $$
BEGIN
  -- point_rules 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'point_rules') THEN
    GRANT SELECT ON public.point_rules TO authenticated;
  END IF;
  
  -- user_point_balances 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_point_balances') THEN
    GRANT SELECT, INSERT, UPDATE ON public.user_point_balances TO authenticated;
  END IF;
  
  -- point_transactions 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'point_transactions') THEN
    GRANT SELECT, INSERT ON public.point_transactions TO authenticated;
  END IF;
  
  -- user_streaks 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_streaks') THEN
    GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
  END IF;
  
  -- badges 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'badges') THEN
    GRANT SELECT ON public.badges TO authenticated;
  END IF;
  
  -- user_badges 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_badges') THEN
    GRANT SELECT, INSERT ON public.user_badges TO authenticated;
  END IF;
END $$;

-- ==================== 授予社区功能表权限 ====================

DO $$
BEGIN
  -- discussions 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'discussions') THEN
    GRANT SELECT, INSERT, UPDATE ON public.discussions TO authenticated;
    GRANT SELECT ON public.discussions TO anon;
  END IF;
  
  -- user_invitations 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_invitations') THEN
    GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO authenticated;
  END IF;
END $$;

-- ==================== 授予 AI 工具表权限 ====================

DO $$
BEGIN
  -- tool_categories 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tool_categories') THEN
    GRANT SELECT ON public.tool_categories TO authenticated;
    GRANT SELECT ON public.tool_categories TO anon;
  END IF;
  
  -- ai_tools 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ai_tools') THEN
    GRANT SELECT ON public.ai_tools TO authenticated;
    GRANT SELECT ON public.ai_tools TO anon;
  END IF;
  
  -- tool_experiences 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tool_experiences') THEN
    GRANT SELECT, INSERT ON public.tool_experiences TO authenticated;
    GRANT SELECT ON public.tool_experiences TO anon;
  END IF;
END $$;

-- ==================== 授予用户学习进度表权限 ====================

DO $$
BEGIN
  -- user_lesson_progress 表
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_lesson_progress') THEN
    GRANT SELECT, INSERT, UPDATE ON public.user_lesson_progress TO authenticated;
  END IF;
END $$;
