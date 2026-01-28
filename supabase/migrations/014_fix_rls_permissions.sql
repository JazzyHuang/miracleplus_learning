-- 修复 RLS 权限问题
-- 问题：users 表的 RLS 策略阻止了其他表的 admin 检查
-- 解决方案：
-- 1. 修改 is_admin() 函数确保能绕过 users 表的 RLS
-- 2. 更新所有引用 users 表的 RLS 策略使用 is_admin() 函数
-- 创建日期: 2026-01-28

-- ==================== 修复 is_admin() 函数 ====================
-- 使用 SECURITY DEFINER 并设置 search_path 确保绕过 RLS
-- 使用 auth.users 的 raw_app_meta_data 作为主要来源，避免依赖 users 表
-- 注意：不能使用 DROP FUNCTION，因为有很多 RLS 策略依赖此函数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _role TEXT;
BEGIN
  -- 首先尝试从 auth.users 的 app_metadata 获取角色（最安全，用户无法修改）
  SELECT raw_app_meta_data->>'role' INTO _role
  FROM auth.users
  WHERE id = auth.uid();
  
  IF _role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- 后备：从 public.users 表获取（需要 SECURITY DEFINER 绕过 RLS）
  SELECT role INTO _role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN _role = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 重新授予执行权限
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ==================== 修复 users 表 RLS 策略 ====================
-- 确保认证用户可以查看自己的 profile

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- 用户可以查看自己的 profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的 profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 用户可以插入自己的记录（通过 trigger 或直接插入）
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 管理员可以查看所有用户（使用修复后的 is_admin 函数）
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- ==================== 修复 workshops 表 RLS 策略 ====================
DROP POLICY IF EXISTS "Anyone can view active workshops" ON public.workshops;
DROP POLICY IF EXISTS "Admins can manage workshops" ON public.workshops;

-- 任何认证用户可以查看活跃的 workshops
CREATE POLICY "Anyone can view active workshops" ON public.workshops
  FOR SELECT USING (is_active = true OR public.is_admin());

-- 管理员可以管理所有 workshops
CREATE POLICY "Admins can manage workshops" ON public.workshops
  FOR ALL USING (public.is_admin());

-- ==================== 修复 courses 表 RLS 策略 ====================
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;

-- 任何认证用户可以查看已发布的 courses
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (is_published = true OR public.is_admin());

-- 管理员可以管理所有 courses
CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (public.is_admin());

-- ==================== 修复 chapters 表 RLS 策略 ====================
DROP POLICY IF EXISTS "Anyone can view chapters of published courses" ON public.chapters;
DROP POLICY IF EXISTS "Admins can manage chapters" ON public.chapters;

-- 任何认证用户可以查看已发布课程的章节
CREATE POLICY "Anyone can view chapters of published courses" ON public.chapters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND is_published = true
    ) OR public.is_admin()
  );

-- 管理员可以管理所有章节
CREATE POLICY "Admins can manage chapters" ON public.chapters
  FOR ALL USING (public.is_admin());

-- ==================== 修复 lessons 表 RLS 策略 ====================
DROP POLICY IF EXISTS "Anyone can view lessons of published courses" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;

-- 任何认证用户可以查看已发布课程的课时
CREATE POLICY "Anyone can view lessons of published courses" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.courses co ON c.course_id = co.id
      WHERE c.id = chapter_id AND co.is_published = true
    ) OR public.is_admin()
  );

-- 管理员可以管理所有课时
CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (public.is_admin());

-- ==================== 修复 questions 表 RLS 策略 ====================
DROP POLICY IF EXISTS "Anyone can view questions of published courses" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

-- 任何认证用户可以查看已发布课程的问题
CREATE POLICY "Anyone can view questions of published courses" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.chapters c ON l.chapter_id = c.id
      JOIN public.courses co ON c.course_id = co.id
      WHERE l.id = lesson_id AND co.is_published = true
    ) OR public.is_admin()
  );

-- 管理员可以管理所有问题
CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (public.is_admin());

-- ==================== 确保 handle_new_user 函数正确创建用户记录 ====================
-- 重新创建 trigger 函数，确保新用户自动获得 profile 记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确保 trigger 存在
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== 为现有用户创建缺失的 profile 记录 ====================
-- 同步 auth.users 到 public.users（如果记录不存在）
INSERT INTO public.users (id, email, name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
