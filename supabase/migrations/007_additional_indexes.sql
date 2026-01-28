-- 额外的性能优化索引
-- 针对 user_lesson_progress 表和常见查询模式

-- user_lesson_progress 表索引
CREATE INDEX IF NOT EXISTS idx_progress_user_course 
ON public.user_lesson_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_progress_user_lesson 
ON public.user_lesson_progress(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_progress_completed 
ON public.user_lesson_progress(user_id, is_completed) 
WHERE is_completed = true;

-- 用于获取最近学习课时的索引
CREATE INDEX IF NOT EXISTS idx_progress_updated 
ON public.user_lesson_progress(user_id, updated_at DESC);

-- workshop_checkins 按用户查询优化
CREATE INDEX IF NOT EXISTS idx_checkins_user_date 
ON public.workshop_checkins(user_id, created_at DESC);

-- courses 按创建时间排序（用于管理后台）
CREATE INDEX IF NOT EXISTS idx_courses_created 
ON public.courses(created_at DESC);

-- workshops 按创建时间排序（用于管理后台）
CREATE INDEX IF NOT EXISTS idx_workshops_created 
ON public.workshops(created_at DESC);

-- 用于统计的部分索引
-- 活跃 workshop 计数
CREATE INDEX IF NOT EXISTS idx_workshops_active_only 
ON public.workshops(id) WHERE is_active = true;

-- 已发布课程计数
CREATE INDEX IF NOT EXISTS idx_courses_published_only 
ON public.courses(id) WHERE is_published = true;

-- 用于 user_answers 的统计索引
CREATE INDEX IF NOT EXISTS idx_answers_correct 
ON public.user_answers(user_id, is_correct) WHERE is_correct = true;
