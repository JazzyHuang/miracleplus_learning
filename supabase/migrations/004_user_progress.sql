-- 用户课程学习进度表
-- 记录用户完成的课时和学习位置

CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  last_position INTEGER DEFAULT 0, -- 阅读位置（滚动位置，可用于长内容）
  time_spent INTEGER DEFAULT 0, -- 阅读时长（秒）
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON user_lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_course ON user_lesson_progress(user_id, course_id);

-- RLS 策略
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的进度
CREATE POLICY "Users can view own progress"
  ON user_lesson_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_lesson_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_user_lesson_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_lesson_progress_updated_at
  BEFORE UPDATE ON user_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_lesson_progress_updated_at();

-- 添加注释
COMMENT ON TABLE user_lesson_progress IS '用户课程学习进度表';
COMMENT ON COLUMN user_lesson_progress.is_completed IS '课时是否完成';
COMMENT ON COLUMN user_lesson_progress.last_position IS '最后阅读位置（滚动位置）';
COMMENT ON COLUMN user_lesson_progress.time_spent IS '累计阅读时长（秒）';
