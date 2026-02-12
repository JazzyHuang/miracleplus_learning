-- 046: 每日任务系统 + 连续登录保护（Streak Freeze）
-- Phase 2.1 + 2.2

-- ==================== 每日任务表 ====================
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  current_count INTEGER NOT NULL DEFAULT 0,
  bonus_points INTEGER NOT NULL DEFAULT 0,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_type, quest_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS ml_idx_daily_quests_user_date
  ON public.miracle_learning_20260209_daily_quests(user_id, quest_date);

-- RLS
ALTER TABLE public.miracle_learning_20260209_daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "[ML] View own quests" ON public.miracle_learning_20260209_daily_quests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] System manages quests" ON public.miracle_learning_20260209_daily_quests
  FOR ALL USING (auth.uid() = user_id);

-- 权限
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_daily_quests TO authenticated;

-- ==================== Streak Freeze 列 ====================
-- 在 user_streaks 表添加 freeze 相关列
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miracle_learning_20260209_user_streaks' AND column_name = 'freeze_count'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_user_streaks
      ADD COLUMN freeze_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'miracle_learning_20260209_user_streaks' AND column_name = 'freeze_used_at'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_user_streaks
      ADD COLUMN freeze_used_at DATE;
  END IF;
END $$;
