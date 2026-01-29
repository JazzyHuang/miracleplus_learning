-- Additional performance indexes for dashboard queries
-- These indexes optimize the getUserLearningStats function

-- Index for counting total lessons
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_for_count
ON public.lessons(chapter_id);

-- Index for counting active workshops (optimized for COUNT queries)
CREATE INDEX IF NOT EXISTS idx_workshops_active_count
ON public.workshops(id) WHERE is_active = true;

-- Index for user learning stats queries
-- Covers the completed lessons count query
CREATE INDEX IF NOT EXISTS idx_user_progress_user_completed_count
ON public.user_lesson_progress(user_id, is_completed)
WHERE is_completed = true;

-- Covers the quiz accuracy query
CREATE INDEX IF NOT EXISTS idx_user_answers_user_accuracy
ON public.user_answers(user_id, is_correct);

-- Covers the workshop checkins count query
CREATE INDEX IF NOT EXISTS idx_workshop_checkins_user_count
ON public.workshop_checkins(user_id);
