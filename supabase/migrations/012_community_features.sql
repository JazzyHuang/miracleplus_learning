-- =====================================================
-- 社区功能数据库迁移
-- Phase 5: 社区互动与离职转化功能
-- 创建日期: 2026-01-28
-- =====================================================

-- ==================== 讨论话题表 ====================
CREATE TABLE IF NOT EXISTS public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 20),
  tags TEXT[],
  participant_count INTEGER DEFAULT 1,
  comment_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussions_user ON public.discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON public.discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_pinned ON public.discussions(is_pinned) WHERE is_pinned = TRUE;

-- ==================== 讨论参与记录表 ====================
CREATE TABLE IF NOT EXISTS public.discussion_participants (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, discussion_id)
);

-- ==================== 邀请记录表 ====================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'completed')),
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON public.user_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.user_invitations(invite_code);

-- ==================== 兑换商品表 ====================
CREATE TABLE IF NOT EXISTS public.reward_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock INTEGER DEFAULT -1,  -- -1 表示无限
  max_per_user INTEGER DEFAULT 1,  -- 每人限购数量
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_items_active ON public.reward_items(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_reward_items_category ON public.reward_items(category);

-- ==================== 兑换订单表 ====================
CREATE TABLE IF NOT EXISTS public.reward_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.reward_items(id),
  points_spent INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
  shipping_info JSONB,  -- 收货信息
  notes TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_orders_user ON public.reward_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_orders_status ON public.reward_orders(status);

-- ==================== 证书记录表 ====================
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ai_navigator', 'completion', 'achievement')),
  certificate_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,  -- 额外信息（课程、积分、成就等）
  
  UNIQUE(user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.certificates(certificate_number);

-- ==================== 触发器：更新讨论统计 ====================

-- 更新评论计数（复用 comments 表）
CREATE OR REPLACE FUNCTION public.update_discussion_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'discussion' THEN
    UPDATE discussions
    SET comment_count = comment_count + 1, updated_at = NOW()
    WHERE id = NEW.target_id;
    
    -- 添加参与者
    INSERT INTO discussion_participants (user_id, discussion_id)
    VALUES (NEW.user_id, NEW.target_id)
    ON CONFLICT DO NOTHING;
    
    -- 更新参与人数
    UPDATE discussions
    SET participant_count = (
      SELECT COUNT(*) FROM discussion_participants WHERE discussion_id = NEW.target_id
    )
    WHERE id = NEW.target_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE AND NEW.target_type = 'discussion' THEN
    UPDATE discussions
    SET comment_count = GREATEST(0, comment_count - 1), updated_at = NOW()
    WHERE id = NEW.target_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'discussion' THEN
    UPDATE discussions
    SET comment_count = GREATEST(0, comment_count - 1), updated_at = NOW()
    WHERE id = OLD.target_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为不同操作创建单独的触发器，避免 NEW/OLD 引用问题
DROP TRIGGER IF EXISTS trigger_discussion_comment_insert ON public.comments;
CREATE TRIGGER trigger_discussion_comment_insert
  AFTER INSERT ON public.comments
  FOR EACH ROW
  WHEN (NEW.target_type = 'discussion')
  EXECUTE FUNCTION public.update_discussion_comment_count();

DROP TRIGGER IF EXISTS trigger_discussion_comment_delete ON public.comments;
CREATE TRIGGER trigger_discussion_comment_delete
  AFTER DELETE ON public.comments
  FOR EACH ROW
  WHEN (OLD.target_type = 'discussion')
  EXECUTE FUNCTION public.update_discussion_comment_count();

DROP TRIGGER IF EXISTS trigger_discussion_comment_update ON public.comments;
CREATE TRIGGER trigger_discussion_comment_update
  AFTER UPDATE OF is_deleted ON public.comments
  FOR EACH ROW
  WHEN (NEW.target_type = 'discussion' OR OLD.target_type = 'discussion')
  EXECUTE FUNCTION public.update_discussion_comment_count();

-- 更新讨论点赞计数
CREATE OR REPLACE FUNCTION public.update_discussion_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'discussion' THEN
    UPDATE discussions SET like_count = like_count + 1 WHERE id = NEW.target_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'discussion' THEN
    UPDATE discussions SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为不同操作创建单独的触发器，避免 NEW/OLD 引用问题
DROP TRIGGER IF EXISTS trigger_discussion_like_insert ON public.likes;
CREATE TRIGGER trigger_discussion_like_insert
  AFTER INSERT ON public.likes
  FOR EACH ROW
  WHEN (NEW.target_type = 'discussion')
  EXECUTE FUNCTION public.update_discussion_like_count();

DROP TRIGGER IF EXISTS trigger_discussion_like_delete ON public.likes;
CREATE TRIGGER trigger_discussion_like_delete
  AFTER DELETE ON public.likes
  FOR EACH ROW
  WHEN (OLD.target_type = 'discussion')
  EXECUTE FUNCTION public.update_discussion_like_count();

-- ==================== 生成邀请码函数 ====================
CREATE OR REPLACE FUNCTION public.generate_invite_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- 生成8位随机码
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    
    -- 检查是否已存在
    SELECT EXISTS(SELECT 1 FROM user_invitations WHERE invite_code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      -- 创建邀请记录
      INSERT INTO user_invitations (inviter_id, invite_code)
      VALUES (p_user_id, v_code);
      
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==================== 生成证书编号函数 ====================
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(NOW(), 'YYYY');
  
  -- 获取当年序列号
  SELECT COALESCE(MAX(
    CASE 
      WHEN certificate_number LIKE 'ML' || v_year || '%' 
      THEN NULLIF(regexp_replace(certificate_number, '[^0-9]', '', 'g'), '')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM certificates;
  
  v_number := 'ML' || v_year || lpad(v_seq::text, 6, '0');
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ==================== RLS 策略 ====================

-- discussions 表
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active discussions" ON public.discussions;
CREATE POLICY "Anyone can view active discussions" ON public.discussions
  FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create discussions" ON public.discussions;
CREATE POLICY "Users can create discussions" ON public.discussions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own discussions" ON public.discussions;
CREATE POLICY "Users can update their own discussions" ON public.discussions
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete discussions" ON public.discussions;
CREATE POLICY "Admins can delete discussions" ON public.discussions
  FOR DELETE USING (public.is_admin());

-- discussion_participants 表
ALTER TABLE public.discussion_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view participants" ON public.discussion_participants;
CREATE POLICY "Anyone can view participants" ON public.discussion_participants
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Participants added automatically" ON public.discussion_participants;
CREATE POLICY "Participants added automatically" ON public.discussion_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_invitations 表
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invitations" ON public.user_invitations;
CREATE POLICY "Users can view their own invitations" ON public.user_invitations
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create invitations" ON public.user_invitations;
CREATE POLICY "Users can create invitations" ON public.user_invitations
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "System can update invitations" ON public.user_invitations;
CREATE POLICY "System can update invitations" ON public.user_invitations
  FOR UPDATE USING (public.is_admin() OR auth.uid() = inviter_id);

-- reward_items 表
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active items" ON public.reward_items;
CREATE POLICY "Anyone can view active items" ON public.reward_items
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage items" ON public.reward_items;
CREATE POLICY "Admins can manage items" ON public.reward_items
  FOR ALL USING (public.is_admin());

-- reward_orders 表
ALTER TABLE public.reward_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.reward_orders;
CREATE POLICY "Users can view their own orders" ON public.reward_orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create orders" ON public.reward_orders;
CREATE POLICY "Users can create orders" ON public.reward_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage orders" ON public.reward_orders;
CREATE POLICY "Admins can manage orders" ON public.reward_orders
  FOR ALL USING (public.is_admin());

-- certificates 表
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
CREATE POLICY "Users can view their own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "System can manage certificates" ON public.certificates;
CREATE POLICY "System can manage certificates" ON public.certificates
  FOR ALL USING (public.is_admin());

-- ==================== 初始化示例奖品数据 ====================
INSERT INTO public.reward_items (name, description, image_url, category, points_cost, stock, max_per_user, is_featured, order_index) VALUES
  ('Miracle Learning 定制贴纸包', '精美贴纸包，包含10张定制贴纸', NULL, 'physical', 200, 100, 2, FALSE, 1),
  ('专属学习笔记本', 'A5精装笔记本，含Miracle Learning LOGO', NULL, 'physical', 500, 50, 1, TRUE, 2),
  ('线下活动优先席位', '获得下次线下活动的优先报名资格', NULL, 'privilege', 300, -1, 3, FALSE, 3),
  ('1对1学习咨询（15分钟）', '与导师进行15分钟的1对1学习咨询', NULL, 'service', 1000, 10, 1, TRUE, 4),
  ('VIP 学习群入群资格', '加入VIP学习交流群，与更多优秀学员交流', NULL, 'privilege', 800, -1, 1, FALSE, 5)
ON CONFLICT DO NOTHING;

-- ==================== 添加注释 ====================
COMMENT ON TABLE public.discussions IS '讨论话题表';
COMMENT ON TABLE public.discussion_participants IS '讨论参与记录表';
COMMENT ON TABLE public.user_invitations IS '邀请记录表';
COMMENT ON TABLE public.reward_items IS '兑换商品表';
COMMENT ON TABLE public.reward_orders IS '兑换订单表';
COMMENT ON TABLE public.certificates IS '证书记录表';
COMMENT ON FUNCTION public.generate_invite_code IS '生成唯一邀请码';
COMMENT ON FUNCTION public.generate_certificate_number IS '生成证书编号';
