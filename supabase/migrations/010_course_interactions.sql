-- =====================================================
-- 录播课交互功能数据库迁移
-- Phase 3: 录播课增强（飞书跳转模式）
-- 创建日期: 2026-01-27
-- =====================================================

-- ==================== 课程感想/评论表 ====================
-- 按课程级别（非课时级别），每个课程只能发表一次感想
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 50),  -- 至少 50 字
  is_featured BOOLEAN DEFAULT FALSE,  -- 是否精选
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每个课程只能发表一次感想
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON public.course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user ON public.course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_featured ON public.course_reviews(is_featured) WHERE is_featured = TRUE;

-- ==================== 学习笔记表 ====================
-- 可关联课程或具体课时
CREATE TABLE IF NOT EXISTS public.course_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,  -- 可选，关联具体课时
  title TEXT NOT NULL,
  content TEXT NOT NULL,  -- Markdown 格式
  is_public BOOLEAN DEFAULT TRUE,
  like_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_notes_course ON public.course_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_lesson ON public.course_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_user ON public.course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_public ON public.course_notes(is_public) WHERE is_public = TRUE;

-- ==================== 笔记收藏表 ====================
CREATE TABLE IF NOT EXISTS public.note_bookmarks (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.course_notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, note_id)
);

-- ==================== 问答问题表 ====================
CREATE TABLE IF NOT EXISTS public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,  -- 可选，关联具体课时
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 20),  -- 至少 20 字
  bounty_points INTEGER DEFAULT 0,  -- 悬赏积分
  is_resolved BOOLEAN DEFAULT FALSE,
  accepted_answer_id UUID,  -- 被采纳的答案
  view_count INTEGER DEFAULT 0,
  answer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_questions_course ON public.qa_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_lesson ON public.qa_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_user ON public.qa_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_resolved ON public.qa_questions(is_resolved);
CREATE INDEX IF NOT EXISTS idx_qa_questions_bounty ON public.qa_questions(bounty_points) WHERE bounty_points > 0;

-- ==================== 问答回答表 ====================
CREATE TABLE IF NOT EXISTS public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 20),  -- 至少 20 字
  is_featured BOOLEAN DEFAULT FALSE,  -- 是否精选
  is_accepted BOOLEAN DEFAULT FALSE,  -- 是否被采纳
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_answers_question ON public.qa_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_qa_answers_user ON public.qa_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_answers_accepted ON public.qa_answers(is_accepted) WHERE is_accepted = TRUE;

-- ==================== 扩展 user_lesson_progress 表 ====================
-- 添加手动标记完成功能
ALTER TABLE public.user_lesson_progress 
  ADD COLUMN IF NOT EXISTS marked_complete_at TIMESTAMPTZ;  -- 用户手动标记完成的时间

-- ==================== 课程里程碑记录表 ====================
-- 记录用户获得的课程里程碑奖励（防止重复发放）
CREATE TABLE IF NOT EXISTS public.course_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,  -- '50_percent', '100_percent', 'marathon'
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  points_awarded INTEGER NOT NULL,
  
  -- 每个里程碑只能获得一次
  UNIQUE(user_id, course_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON public.course_milestones(user_id);

-- ==================== 更新问答计数的触发器函数 ====================
CREATE OR REPLACE FUNCTION public.update_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE qa_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE qa_questions SET answer_count = GREATEST(0, answer_count - 1) WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_answer_count ON public.qa_answers;
CREATE TRIGGER trigger_update_answer_count
  AFTER INSERT OR DELETE ON public.qa_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_answer_count();

-- ==================== 采纳答案函数 ====================
CREATE OR REPLACE FUNCTION public.accept_answer(
  p_question_id UUID,
  p_answer_id UUID,
  p_user_id UUID  -- 问题作者 ID
) RETURNS BOOLEAN AS $$
DECLARE
  v_bounty INTEGER;
  v_answerer_id UUID;
BEGIN
  -- 验证问题归属
  IF NOT EXISTS (
    SELECT 1 FROM qa_questions 
    WHERE id = p_question_id AND user_id = p_user_id AND is_resolved = FALSE
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- 获取答案作者
  SELECT user_id INTO v_answerer_id
  FROM qa_answers
  WHERE id = p_answer_id AND question_id = p_question_id;
  
  IF v_answerer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 获取悬赏积分
  SELECT bounty_points INTO v_bounty
  FROM qa_questions
  WHERE id = p_question_id;
  
  -- 更新问题状态
  UPDATE qa_questions
  SET is_resolved = TRUE,
      accepted_answer_id = p_answer_id,
      updated_at = NOW()
  WHERE id = p_question_id;
  
  -- 标记答案为被采纳
  UPDATE qa_answers
  SET is_accepted = TRUE,
      updated_at = NOW()
  WHERE id = p_answer_id;
  
  -- 如果有悬赏，发放给答案作者
  IF v_bounty > 0 THEN
    PERFORM public.add_user_points(
      v_answerer_id,
      v_bounty,
      'BOUNTY_REWARD',
      p_answer_id,
      'answer',
      '问答悬赏奖励'
    );
  END IF;
  
  -- 发放基础回答积分
  PERFORM public.add_user_points(
    v_answerer_id,
    30,
    'COURSE_ANSWER',
    p_answer_id,
    'answer',
    '回答被采纳'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==================== 标记课时完成函数 ====================
CREATE OR REPLACE FUNCTION public.mark_lesson_complete(
  p_user_id UUID,
  p_lesson_id UUID,
  p_course_id UUID
) RETURNS TABLE (
  points_earned INTEGER,
  milestone_achieved TEXT,
  milestone_points INTEGER
) AS $$
DECLARE
  v_points INTEGER := 0;
  v_milestone TEXT := NULL;
  v_milestone_points INTEGER := 0;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_completion_percent DECIMAL;
  v_today_completed INTEGER;
BEGIN
  -- 检查是否已经标记过
  IF EXISTS (
    SELECT 1 FROM user_lesson_progress
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND marked_complete_at IS NOT NULL
  ) THEN
    -- 已经标记过，不重复发放积分
    RETURN QUERY SELECT 0, NULL::TEXT, 0;
    RETURN;
  END IF;
  
  -- 插入或更新进度记录
  INSERT INTO user_lesson_progress (user_id, lesson_id, course_id, is_completed, marked_complete_at, completed_at)
  VALUES (p_user_id, p_lesson_id, p_course_id, TRUE, NOW(), NOW())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET is_completed = TRUE,
      marked_complete_at = NOW(),
      completed_at = COALESCE(user_lesson_progress.completed_at, NOW()),
      updated_at = NOW();
  
  -- 发放课时完成积分
  v_points := public.add_user_points(
    p_user_id,
    50,
    'LESSON_MARK_COMPLETE',
    p_lesson_id,
    'lesson',
    '标记课时完成'
  );
  
  -- 检查里程碑
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons l
  JOIN chapters c ON l.chapter_id = c.id
  WHERE c.course_id = p_course_id;
  
  SELECT COUNT(*) INTO v_completed_lessons
  FROM user_lesson_progress ulp
  JOIN lessons l ON ulp.lesson_id = l.id
  JOIN chapters c ON l.chapter_id = c.id
  WHERE ulp.user_id = p_user_id 
    AND c.course_id = p_course_id 
    AND ulp.is_completed = TRUE;
  
  v_completion_percent := (v_completed_lessons::DECIMAL / v_total_lessons) * 100;
  
  -- 50% 里程碑
  IF v_completion_percent >= 50 AND NOT EXISTS (
    SELECT 1 FROM course_milestones
    WHERE user_id = p_user_id AND course_id = p_course_id AND milestone_type = '50_percent'
  ) THEN
    INSERT INTO course_milestones (user_id, course_id, milestone_type, points_awarded)
    VALUES (p_user_id, p_course_id, '50_percent', 100);
    
    v_milestone := '50_percent';
    v_milestone_points := public.add_user_points(
      p_user_id, 100, 'COURSE_50_PERCENT', p_course_id, 'course', '完成 50% 课程里程碑'
    );
  END IF;
  
  -- 100% 里程碑
  IF v_completion_percent >= 100 AND NOT EXISTS (
    SELECT 1 FROM course_milestones
    WHERE user_id = p_user_id AND course_id = p_course_id AND milestone_type = '100_percent'
  ) THEN
    INSERT INTO course_milestones (user_id, course_id, milestone_type, points_awarded)
    VALUES (p_user_id, p_course_id, '100_percent', 300);
    
    v_milestone := '100_percent';
    v_milestone_points := public.add_user_points(
      p_user_id, 300, 'COURSE_100_PERCENT', p_course_id, 'course', '完成 100% 课程里程碑'
    );
  END IF;
  
  -- 马拉松检查（一天完成 3 节）
  SELECT COUNT(*) INTO v_today_completed
  FROM user_lesson_progress
  WHERE user_id = p_user_id
    AND marked_complete_at >= CURRENT_DATE
    AND marked_complete_at < CURRENT_DATE + 1;
  
  IF v_today_completed >= 3 AND NOT EXISTS (
    SELECT 1 FROM course_milestones
    WHERE user_id = p_user_id 
      AND milestone_type = 'marathon'
      AND achieved_at >= CURRENT_DATE
  ) THEN
    INSERT INTO course_milestones (user_id, course_id, milestone_type, points_awarded)
    VALUES (p_user_id, p_course_id, 'marathon', 100);
    
    v_milestone := 'marathon';
    v_milestone_points := public.add_user_points(
      p_user_id, 100, 'COURSE_MARATHON', NULL, NULL, '马拉松挑战：一天完成 3 节课'
    );
  END IF;
  
  RETURN QUERY SELECT v_points, v_milestone, v_milestone_points;
END;
$$ LANGUAGE plpgsql;

-- ==================== RLS 策略 ====================

-- course_reviews 表
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.course_reviews;
CREATE POLICY "Anyone can view reviews" ON public.course_reviews
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create reviews" ON public.course_reviews;
CREATE POLICY "Users can create reviews" ON public.course_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.course_reviews;
CREATE POLICY "Users can update their own reviews" ON public.course_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.course_reviews;
CREATE POLICY "Admins can manage reviews" ON public.course_reviews
  FOR ALL USING (public.is_admin());

-- course_notes 表
ALTER TABLE public.course_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public notes and own notes" ON public.course_notes;
CREATE POLICY "Users can view public notes and own notes" ON public.course_notes
  FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create notes" ON public.course_notes;
CREATE POLICY "Users can create notes" ON public.course_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.course_notes;
CREATE POLICY "Users can update their own notes" ON public.course_notes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.course_notes;
CREATE POLICY "Users can delete their own notes" ON public.course_notes
  FOR DELETE USING (auth.uid() = user_id);

-- note_bookmarks 表
ALTER TABLE public.note_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.note_bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.note_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their bookmarks" ON public.note_bookmarks;
CREATE POLICY "Users can manage their bookmarks" ON public.note_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- qa_questions 表
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view questions" ON public.qa_questions;
CREATE POLICY "Anyone can view questions" ON public.qa_questions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create questions" ON public.qa_questions;
CREATE POLICY "Users can create questions" ON public.qa_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own questions" ON public.qa_questions;
CREATE POLICY "Users can update their own questions" ON public.qa_questions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage questions" ON public.qa_questions;
CREATE POLICY "Admins can manage questions" ON public.qa_questions
  FOR ALL USING (public.is_admin());

-- qa_answers 表
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view answers" ON public.qa_answers;
CREATE POLICY "Anyone can view answers" ON public.qa_answers
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create answers" ON public.qa_answers;
CREATE POLICY "Users can create answers" ON public.qa_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own answers" ON public.qa_answers;
CREATE POLICY "Users can update their own answers" ON public.qa_answers
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage answers" ON public.qa_answers;
CREATE POLICY "Admins can manage answers" ON public.qa_answers
  FOR ALL USING (public.is_admin());

-- course_milestones 表
ALTER TABLE public.course_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own milestones" ON public.course_milestones;
CREATE POLICY "Users can view their own milestones" ON public.course_milestones
  FOR SELECT USING (auth.uid() = user_id);

-- ==================== 授予函数执行权限 ====================
GRANT EXECUTE ON FUNCTION public.accept_answer(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_lesson_complete(UUID, UUID, UUID) TO authenticated;

-- ==================== 添加注释 ====================
COMMENT ON TABLE public.course_reviews IS '课程感想/评论表（课程级别）';
COMMENT ON TABLE public.course_notes IS '学习笔记表';
COMMENT ON TABLE public.note_bookmarks IS '笔记收藏表';
COMMENT ON TABLE public.qa_questions IS '问答问题表';
COMMENT ON TABLE public.qa_answers IS '问答回答表';
COMMENT ON TABLE public.course_milestones IS '课程里程碑记录表';
COMMENT ON FUNCTION public.accept_answer IS '采纳答案并发放悬赏积分';
COMMENT ON FUNCTION public.mark_lesson_complete IS '标记课时完成并检查里程碑';
