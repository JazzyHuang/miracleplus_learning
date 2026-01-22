-- Performance optimization indexes
-- These composite indexes speed up common query patterns

-- Index for user role lookups (used in RLS policies and admin checks)
CREATE INDEX IF NOT EXISTS idx_users_id_role ON public.users(id, role);

-- Index for published courses sorted by order (most common query)
CREATE INDEX IF NOT EXISTS idx_courses_published_order ON public.courses(is_published, order_index);

-- Index for active workshops sorted by date (most common query)
CREATE INDEX IF NOT EXISTS idx_workshops_active_date ON public.workshops(is_active, event_date DESC);

-- Index for chapters sorted by order within a course
CREATE INDEX IF NOT EXISTS idx_chapters_course_order ON public.chapters(course_id, order_index);

-- Index for lessons sorted by order within a chapter
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_order ON public.lessons(chapter_id, order_index);

-- Index for questions sorted by order within a lesson
CREATE INDEX IF NOT EXISTS idx_questions_lesson_order ON public.questions(lesson_id, order_index);

-- Index for user answers lookup (user + question combination)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_answers_user_question 
ON public.user_answers(user_id, question_id);

-- Index for workshop checkins by workshop (for gallery queries)
CREATE INDEX IF NOT EXISTS idx_checkins_workshop_date 
ON public.workshop_checkins(workshop_id, created_at DESC);
