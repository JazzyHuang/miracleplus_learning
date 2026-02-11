-- ============================================================================
-- Migration 042: Performance Optimization
-- ============================================================================
-- 综合性能优化迁移，包含：
-- 1. RLS 策略优化：消除多表 JOIN，改用冗余列 + 单表查找
-- 2. 快速 admin 检查：读 JWT claims 而非查表
-- 3. 工具评分原子操作：合并 3 次查询为 1 个 RPC
-- 4. 物化视图优化：消除 O(n²) 子查询
-- 5. 部分索引：加速高频过滤查询
-- 6. 课程进度 RPC 扩展：增加 milestones 返回
-- ============================================================================

BEGIN;

-- =============================================================
-- PART 1: RLS 策略性能优化 — 冗余 course_id 列
-- =============================================================

-- 1a. 给 lessons 表添加冗余 course_id 列
ALTER TABLE public.miracle_learning_20260209_lessons
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE;

-- 1b. 给 questions 表添加冗余 course_id 列
ALTER TABLE public.miracle_learning_20260209_questions
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE;

-- 1c. 回填 lessons.course_id
UPDATE public.miracle_learning_20260209_lessons l
SET course_id = c.course_id
FROM public.miracle_learning_20260209_chapters c
WHERE l.chapter_id = c.id AND l.course_id IS NULL;

-- 1d. 回填 questions.course_id
UPDATE public.miracle_learning_20260209_questions q
SET course_id = c.course_id
FROM public.miracle_learning_20260209_chapters c
JOIN public.miracle_learning_20260209_lessons l ON l.chapter_id = c.id
WHERE q.lesson_id = l.id AND q.course_id IS NULL;

-- 1e. 索引
CREATE INDEX IF NOT EXISTS ml_idx_lessons_course_id
  ON public.miracle_learning_20260209_lessons(course_id);
CREATE INDEX IF NOT EXISTS ml_idx_questions_course_id
  ON public.miracle_learning_20260209_questions(course_id);

-- 1f. 触发器：新插入时自动填充 course_id
CREATE OR REPLACE FUNCTION public.ml_set_lesson_course_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.course_id IS NULL AND NEW.chapter_id IS NOT NULL THEN
    SELECT course_id INTO NEW.course_id
    FROM public.miracle_learning_20260209_chapters WHERE id = NEW.chapter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ml_lesson_set_course_id ON public.miracle_learning_20260209_lessons;
CREATE TRIGGER ml_lesson_set_course_id
  BEFORE INSERT OR UPDATE OF chapter_id ON public.miracle_learning_20260209_lessons
  FOR EACH ROW EXECUTE FUNCTION public.ml_set_lesson_course_id();

CREATE OR REPLACE FUNCTION public.ml_set_question_course_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.course_id IS NULL AND NEW.lesson_id IS NOT NULL THEN
    SELECT c.course_id INTO NEW.course_id
    FROM public.miracle_learning_20260209_lessons l
    JOIN public.miracle_learning_20260209_chapters c ON c.id = l.chapter_id
    WHERE l.id = NEW.lesson_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ml_question_set_course_id ON public.miracle_learning_20260209_questions;
CREATE TRIGGER ml_question_set_course_id
  BEFORE INSERT OR UPDATE OF lesson_id ON public.miracle_learning_20260209_questions
  FOR EACH ROW EXECUTE FUNCTION public.ml_set_question_course_id();

-- =============================================================
-- PART 2: 快速 admin 检查（读 JWT claims，不查表）
-- =============================================================

CREATE OR REPLACE FUNCTION public.ml_is_admin_fast()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'admin',
    FALSE
  );
END;
$$;

-- =============================================================
-- PART 3: 替换昂贵的 RLS 策略
-- =============================================================

-- 3a. Lessons: 原策略需要 2 表 JOIN，现在直接查 courses 表
DROP POLICY IF EXISTS "[ML] View lessons" ON public.miracle_learning_20260209_lessons;
CREATE POLICY "[ML] View lessons" ON public.miracle_learning_20260209_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.miracle_learning_20260209_courses
      WHERE id = course_id AND is_published = true
    )
    OR public.ml_is_admin_fast()
  );

-- 3b. Questions: 原策略需要 3 表 JOIN，现在直接查 courses 表
DROP POLICY IF EXISTS "[ML] View questions" ON public.miracle_learning_20260209_questions;
CREATE POLICY "[ML] View questions" ON public.miracle_learning_20260209_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.miracle_learning_20260209_courses
      WHERE id = course_id AND is_published = true
    )
    OR public.ml_is_admin_fast()
  );

-- 3c. Chapters: 策略本身只有 1 表 JOIN（已经不错），但替换 ml_is_admin 为 ml_is_admin_fast
DROP POLICY IF EXISTS "[ML] View chapters" ON public.miracle_learning_20260209_chapters;
CREATE POLICY "[ML] View chapters" ON public.miracle_learning_20260209_chapters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.miracle_learning_20260209_courses
      WHERE id = course_id AND is_published = true
    )
    OR public.ml_is_admin_fast()
  );

-- 3d. 替换其他高频表的 admin 策略为 fast 版本
DROP POLICY IF EXISTS "[ML] Admins manage chapters" ON public.miracle_learning_20260209_chapters;
CREATE POLICY "[ML] Admins manage chapters" ON public.miracle_learning_20260209_chapters
  FOR ALL USING (public.ml_is_admin_fast());

DROP POLICY IF EXISTS "[ML] Admins manage lessons" ON public.miracle_learning_20260209_lessons;
CREATE POLICY "[ML] Admins manage lessons" ON public.miracle_learning_20260209_lessons
  FOR ALL USING (public.ml_is_admin_fast());

DROP POLICY IF EXISTS "[ML] Admins manage questions" ON public.miracle_learning_20260209_questions;
CREATE POLICY "[ML] Admins manage questions" ON public.miracle_learning_20260209_questions
  FOR ALL USING (public.ml_is_admin_fast());

-- 3e. Courses 表也替换为 fast 版本
DROP POLICY IF EXISTS "[ML] View published courses" ON public.miracle_learning_20260209_courses;
CREATE POLICY "[ML] View published courses" ON public.miracle_learning_20260209_courses
  FOR SELECT USING (is_published = true OR public.ml_is_admin_fast());

DROP POLICY IF EXISTS "[ML] Admins manage courses" ON public.miracle_learning_20260209_courses;
CREATE POLICY "[ML] Admins manage courses" ON public.miracle_learning_20260209_courses
  FOR ALL USING (public.ml_is_admin_fast());

-- =============================================================
-- PART 4: 工具评分原子 RPC（合并 3 次查询为 1 次）
-- =============================================================

CREATE OR REPLACE FUNCTION public.ml_submit_tool_rating(
  p_user_id UUID,
  p_tool_id UUID,
  p_rating INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_points_earned INTEGER := 0;
  v_existing_points BOOLEAN;
BEGIN
  -- 参数校验
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- 1. Upsert 评分
  INSERT INTO public.miracle_learning_20260209_tool_ratings (user_id, tool_id, rating, updated_at)
  VALUES (p_user_id, p_tool_id, p_rating, NOW())
  ON CONFLICT (user_id, tool_id) DO UPDATE SET rating = p_rating, updated_at = NOW();

  -- 2. 检查是否已发放过积分
  SELECT EXISTS (
    SELECT 1 FROM public.miracle_learning_20260209_point_transactions
    WHERE user_id = p_user_id AND action_type = 'TOOL_RATING' AND reference_id = p_tool_id
  ) INTO v_existing_points;

  -- 3. 首次评分发放积分
  IF NOT v_existing_points THEN
    v_points_earned := public.ml_add_user_points(
      p_user_id, 5, 'TOOL_RATING', p_tool_id, 'ai_tool', '工具评分'
    );
  END IF;

  RETURN v_points_earned;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_submit_tool_rating(UUID, UUID, INTEGER) TO authenticated;

-- =============================================================
-- PART 5: 物化视图优化（消除 O(n²) 子查询）
-- =============================================================

-- 重建物化视图，用 LEFT JOIN 聚合替代关联子查询
DROP MATERIALIZED VIEW IF EXISTS public.ml_leaderboard_view;

CREATE MATERIALIZED VIEW public.ml_leaderboard_view AS
SELECT
  u.id,
  u.name,
  u.avatar_url,
  COALESCE(upb.total_points, 0) AS total_points,
  COALESCE(upb.level, 1) AS level,
  COALESCE(us.current_streak, 0) AS current_streak,
  COALESCE(bc.badge_count, 0)::bigint AS badge_count,
  ROW_NUMBER() OVER (ORDER BY COALESCE(upb.total_points, 0) DESC) AS rank
FROM public.miracle_learning_20260209_users u
LEFT JOIN public.miracle_learning_20260209_user_point_balance upb ON u.id = upb.user_id
LEFT JOIN public.miracle_learning_20260209_user_streaks us ON u.id = us.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS badge_count
  FROM public.miracle_learning_20260209_user_badges
  GROUP BY user_id
) bc ON u.id = bc.user_id
WHERE u.role != 'admin'
ORDER BY total_points DESC;

CREATE UNIQUE INDEX IF NOT EXISTS ml_idx_leaderboard_view_id ON public.ml_leaderboard_view(id);

-- =============================================================
-- PART 6: 部分索引（加速高频过滤查询）
-- =============================================================

-- 活跃讨论排序
CREATE INDEX IF NOT EXISTS ml_idx_discussions_active_pinned_created
  ON public.miracle_learning_20260209_discussions(is_pinned DESC, created_at DESC)
  WHERE status = 'active';

-- 已完成的课程进度
CREATE INDEX IF NOT EXISTS ml_idx_progress_completed
  ON public.miracle_learning_20260209_user_lesson_progress(user_id, course_id)
  WHERE is_completed = true;

-- 活跃 AI 工具排序
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_active_sort
  ON public.miracle_learning_20260209_ai_tools(is_featured DESC, avg_rating DESC)
  WHERE is_active = true;

-- =============================================================
-- PART 7: 课程进度 RPC 扩展（增加 milestones 返回）
-- =============================================================

-- 先 DROP 旧版本（返回类型不同，不能直接 REPLACE）
DROP FUNCTION IF EXISTS public.ml_get_user_course_progress(UUID, UUID);

CREATE OR REPLACE FUNCTION public.ml_get_user_course_progress(
  p_user_id UUID,
  p_course_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_completed BIGINT;
  v_time_spent BIGINT;
  v_milestones TEXT[];
BEGIN
  IF p_user_id != auth.uid() AND NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Unauthorized: cannot query other user progress';
  END IF;

  -- 单次查询获取总课时数和已完成数
  SELECT
    COUNT(l.id),
    COUNT(ulp.id) FILTER (WHERE ulp.is_completed = true),
    COALESCE(SUM(ulp.time_spent), 0)
  INTO v_total, v_completed, v_time_spent
  FROM public.miracle_learning_20260209_lessons l
  JOIN public.miracle_learning_20260209_chapters c ON c.id = l.chapter_id
  LEFT JOIN public.miracle_learning_20260209_user_lesson_progress ulp
    ON ulp.lesson_id = l.id AND ulp.user_id = p_user_id
  WHERE c.course_id = p_course_id;

  -- 获取里程碑
  SELECT ARRAY_AGG(milestone_type) INTO v_milestones
  FROM public.miracle_learning_20260209_course_milestones
  WHERE user_id = p_user_id AND course_id = p_course_id;

  RETURN jsonb_build_object(
    'total_lessons', v_total,
    'completed_lessons', v_completed,
    'total_time_spent', v_time_spent,
    'percentage', CASE WHEN v_total > 0 THEN ROUND((v_completed::NUMERIC / v_total) * 100) ELSE 0 END,
    'milestones', COALESCE(v_milestones, ARRAY[]::TEXT[])
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ml_get_user_course_progress(UUID, UUID) TO authenticated;

-- =============================================================
-- PART 8: pg_cron 自动刷新排行榜（每 15 分钟）
-- =============================================================

-- 注意：pg_cron 需要在 Supabase Dashboard 中启用
-- 如果 pg_cron 不可用，此部分会静默跳过
DO $$
BEGIN
  -- 先删除旧的 cron job（如果存在）
  PERFORM cron.unschedule('ml-refresh-leaderboard');
EXCEPTION WHEN OTHERS THEN
  -- pg_cron 未启用，跳过
  NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'ml-refresh-leaderboard',
    '*/15 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY public.ml_leaderboard_view'
  );
EXCEPTION WHEN OTHERS THEN
  -- pg_cron 未启用，跳过
  RAISE NOTICE 'pg_cron not available, skipping leaderboard auto-refresh setup';
END;
$$;

COMMIT;
