-- 增强 RLS 策略
-- 修复和完善安全策略

-- ==================== user_lesson_progress 表 RLS ====================
-- 该表在 004_user_progress.sql 中创建，需要添加 RLS

-- 启用 RLS（如果尚未启用）
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的进度
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can view their own progress" ON public.user_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能创建自己的进度
DROP POLICY IF EXISTS "Users can create their own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can create their own progress" ON public.user_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的进度
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can update their own progress" ON public.user_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理员可以查看所有进度（用于统计）
DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_lesson_progress;
CREATE POLICY "Admins can view all progress" ON public.user_lesson_progress
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==================== user_answers 表 RLS 增强 ====================

-- 允许用户更新自己的答案（重新作答）
DROP POLICY IF EXISTS "Users can update their own answers" ON public.user_answers;
CREATE POLICY "Users can update their own answers" ON public.user_answers
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理员可以查看所有答案（用于统计）
DROP POLICY IF EXISTS "Admins can view all answers" ON public.user_answers;
CREATE POLICY "Admins can view all answers" ON public.user_answers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==================== workshop_checkins 表 RLS 增强 ====================

-- 管理员可以删除任何打卡（内容审核）
DROP POLICY IF EXISTS "Admins can delete any checkin" ON public.workshop_checkins;
CREATE POLICY "Admins can delete any checkin" ON public.workshop_checkins
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==================== users 表 RLS 增强 ====================

-- 管理员可以查看所有用户
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- 允许新用户创建自己的记录（通过 trigger）
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
CREATE POLICY "Enable insert for authenticated users only" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==================== 创建唯一约束（如果不存在） ====================

-- user_answers 表的 user_id + question_id 唯一约束
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_answers_user_question_unique'
  ) THEN
    ALTER TABLE public.user_answers 
    ADD CONSTRAINT user_answers_user_question_unique 
    UNIQUE (user_id, question_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
