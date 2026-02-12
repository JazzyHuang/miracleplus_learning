-- 049: 间隔重复复习系统
-- Phase 4.1 — SM-2 算法

CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_review_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_questions(id) ON DELETE CASCADE,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INT NOT NULL DEFAULT 1,
  review_count INT NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS ml_idx_review_schedule_user_next
  ON public.miracle_learning_20260209_review_schedule(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS ml_idx_review_schedule_user
  ON public.miracle_learning_20260209_review_schedule(user_id);

-- RLS
ALTER TABLE public.miracle_learning_20260209_review_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "[ML] View own review schedule" ON public.miracle_learning_20260209_review_schedule
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] Manage own review schedule" ON public.miracle_learning_20260209_review_schedule
  FOR ALL USING (auth.uid() = user_id);

-- 权限
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_review_schedule TO authenticated;

-- RPC: 获取待复习题目数量
DROP FUNCTION IF EXISTS public.ml_get_due_review_count(uuid);
CREATE OR REPLACE FUNCTION public.ml_get_due_review_count(p_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT count(*)::int
  FROM public.miracle_learning_20260209_review_schedule
  WHERE user_id = p_user_id AND next_review_at <= NOW();
$$;

GRANT EXECUTE ON FUNCTION public.ml_get_due_review_count(uuid) TO authenticated;
