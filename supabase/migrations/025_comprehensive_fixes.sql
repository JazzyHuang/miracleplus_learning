-- ============================================================
-- 025_comprehensive_fixes.sql
-- 全面修复：外键约束、级联行为、索引、默认值、updated_at 列
-- ============================================================

-- ============================================================
-- 3.1 缺失的外键约束
-- ============================================================

-- qa_questions.accepted_answer_id -> qa_answers(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ml_qa_questions_accepted_answer'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_qa_questions
      ADD CONSTRAINT fk_ml_qa_questions_accepted_answer
      FOREIGN KEY (accepted_answer_id) REFERENCES public.miracle_learning_20260209_qa_answers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- workshop_submissions.reviewed_by -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ml_workshop_submissions_reviewed_by'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_workshop_submissions
      ADD CONSTRAINT fk_ml_workshop_submissions_reviewed_by
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- instructor_applications.reviewed_by -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ml_instructor_applications_reviewed_by'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_instructor_applications
      ADD CONSTRAINT fk_ml_instructor_applications_reviewed_by
      FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- weekly_picks.picked_by -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ml_weekly_picks_picked_by'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_weekly_picks
      ADD CONSTRAINT fk_ml_weekly_picks_picked_by
      FOREIGN KEY (picked_by) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3.2 修正级联删除行为：CASCADE → SET NULL（可选外键）
-- ============================================================

-- course_notes.lesson_id: 删除课时不应删除用户笔记
ALTER TABLE public.miracle_learning_20260209_course_notes
  DROP CONSTRAINT IF EXISTS course_notes_lesson_id_fkey;
ALTER TABLE public.miracle_learning_20260209_course_notes
  DROP CONSTRAINT IF EXISTS miracle_learning_20260209_course_notes_lesson_id_fkey;
ALTER TABLE public.miracle_learning_20260209_course_notes
  ADD CONSTRAINT miracle_learning_20260209_course_notes_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.miracle_learning_20260209_lessons(id)
  ON DELETE SET NULL;

-- qa_questions.lesson_id: 删除课时不应删除用户问题
ALTER TABLE public.miracle_learning_20260209_qa_questions
  DROP CONSTRAINT IF EXISTS qa_questions_lesson_id_fkey;
ALTER TABLE public.miracle_learning_20260209_qa_questions
  DROP CONSTRAINT IF EXISTS miracle_learning_20260209_qa_questions_lesson_id_fkey;
ALTER TABLE public.miracle_learning_20260209_qa_questions
  ADD CONSTRAINT miracle_learning_20260209_qa_questions_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES public.miracle_learning_20260209_lessons(id)
  ON DELETE SET NULL;

-- ============================================================
-- 3.3 排行榜安全视图（限制公开的列）
-- ============================================================

-- 创建安全视图，仅暴露排行榜所需的公开字段
CREATE OR REPLACE VIEW public.ml_leaderboard_safe_view AS
SELECT
  u.id,
  u.name,
  u.avatar_url,
  COALESCE(b.total_points, 0) AS total_points,
  COALESCE(s.current_streak, 0) AS current_streak,
  COALESCE(s.longest_streak, 0) AS longest_streak
FROM public.miracle_learning_20260209_users u
LEFT JOIN public.miracle_learning_20260209_user_point_balance b ON u.id = b.user_id
LEFT JOIN public.miracle_learning_20260209_user_streaks s ON u.id = s.user_id
ORDER BY COALESCE(b.total_points, 0) DESC;

-- ============================================================
-- 3.4 缺失的数据库索引
-- ============================================================

-- 马拉松成就查询需要的索引
CREATE INDEX IF NOT EXISTS ml_idx_progress_complete_at
  ON public.miracle_learning_20260209_user_lesson_progress(marked_complete_at);

-- 复合索引：用户课程进度查询
CREATE INDEX IF NOT EXISTS ml_idx_progress_user_course_complete
  ON public.miracle_learning_20260209_user_lesson_progress(user_id, course_id, marked_complete_at);

-- Workshop 提交列表排序
CREATE INDEX IF NOT EXISTS ml_idx_workshop_submissions_created
  ON public.miracle_learning_20260209_workshop_submissions(created_at DESC);

-- 复合索引：Workshop 画廊查询
CREATE INDEX IF NOT EXISTS ml_idx_workshop_submissions_gallery
  ON public.miracle_learning_20260209_workshop_submissions(workshop_id, status, created_at DESC);

-- AI 工具经验按时间排序
CREATE INDEX IF NOT EXISTS ml_idx_tool_experiences_created
  ON public.miracle_learning_20260209_tool_experiences(created_at DESC);

-- QA 问题按时间排序
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_created
  ON public.miracle_learning_20260209_qa_questions(created_at DESC);

-- 复合索引：课程 Q&A 列表
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_course_resolved
  ON public.miracle_learning_20260209_qa_questions(course_id, is_resolved, created_at DESC);

-- 评论按时间排序
CREATE INDEX IF NOT EXISTS ml_idx_comments_created
  ON public.miracle_learning_20260209_comments(created_at DESC);

-- ============================================================
-- 3.5 不安全默认值修复
-- ============================================================

-- tool_experiences.status 默认值应为 'pending' 以便审核
ALTER TABLE public.miracle_learning_20260209_tool_experiences
  ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================================
-- 3.6 缺失的 updated_at 列
-- ============================================================

-- 创建通用的 updated_at 触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- workshops 表
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miracle_learning_20260209_workshops' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_workshops ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    CREATE TRIGGER ml_set_workshops_updated_at
      BEFORE UPDATE ON public.miracle_learning_20260209_workshops
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- chapters 表
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miracle_learning_20260209_chapters' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_chapters ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    CREATE TRIGGER ml_set_chapters_updated_at
      BEFORE UPDATE ON public.miracle_learning_20260209_chapters
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- lessons 表
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miracle_learning_20260209_lessons' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_lessons ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    CREATE TRIGGER ml_set_lessons_updated_at
      BEFORE UPDATE ON public.miracle_learning_20260209_lessons
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- questions 表
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miracle_learning_20260209_questions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_questions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    CREATE TRIGGER ml_set_questions_updated_at
      BEFORE UPDATE ON public.miracle_learning_20260209_questions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- workshop_materials 表
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miracle_learning_20260209_workshop_materials' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_workshop_materials ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    CREATE TRIGGER ml_set_workshop_materials_updated_at
      BEFORE UPDATE ON public.miracle_learning_20260209_workshop_materials
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
