-- 047: 持久化通知中心
-- Phase 2.3

CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS ml_idx_notifications_user_unread
  ON public.miracle_learning_20260209_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS ml_idx_notifications_user_created
  ON public.miracle_learning_20260209_notifications(user_id, created_at DESC);

-- RLS
ALTER TABLE public.miracle_learning_20260209_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "[ML] View own notifications" ON public.miracle_learning_20260209_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] Update own notifications" ON public.miracle_learning_20260209_notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] System insert notifications" ON public.miracle_learning_20260209_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.ml_is_admin());

-- 权限
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_notifications TO authenticated;
