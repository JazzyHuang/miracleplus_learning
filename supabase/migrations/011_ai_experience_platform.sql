-- =====================================================
-- AI 体验台数据库迁移
-- Phase 4: AI 工具体验平台
-- 创建日期: 2026-01-28
-- =====================================================

-- ==================== AI 工具分类表 ====================
CREATE TABLE IF NOT EXISTS public.tool_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,  -- Lucide icon name
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_categories_order ON public.tool_categories(order_index);

-- ==================== AI 工具库表 ====================
CREATE TABLE IF NOT EXISTS public.ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.tool_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  logo_url TEXT,
  website_url TEXT,
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('free', 'freemium', 'paid')),
  pricing_details TEXT,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  experience_count INTEGER DEFAULT 0,
  case_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tools_category ON public.ai_tools(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_featured ON public.ai_tools(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_tools_rating ON public.ai_tools(avg_rating DESC);

-- ==================== 工具评分表 ====================
CREATE TABLE IF NOT EXISTS public.tool_ratings (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.ai_tools(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_ratings_tool ON public.tool_ratings(tool_id);

-- ==================== 灵感碎片/使用心得表 ====================
CREATE TABLE IF NOT EXISTS public.tool_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.ai_tools(id) ON DELETE CASCADE,
  use_case TEXT NOT NULL,  -- 使用场景
  pros TEXT,               -- 优点
  cons TEXT,               -- 缺点
  screenshot_url TEXT NOT NULL,  -- 截图（必需，防刷）
  like_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_experiences_tool ON public.tool_experiences(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_experiences_user ON public.tool_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_experiences_featured ON public.tool_experiences(is_featured) WHERE is_featured = TRUE;

-- ==================== 应用案例表 ====================
CREATE TABLE IF NOT EXISTS public.tool_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.ai_tools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_background TEXT NOT NULL,
  solution TEXT NOT NULL,
  result TEXT,
  images TEXT[],
  tags TEXT[],
  like_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_cases_tool ON public.tool_cases(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_cases_user ON public.tool_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_cases_featured ON public.tool_cases(is_featured) WHERE is_featured = TRUE;

-- ==================== 工具对比表 ====================
CREATE TABLE IF NOT EXISTS public.tool_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tool_ids UUID[] NOT NULL,  -- 2-3 个工具 ID
  comparison_content JSONB NOT NULL,  -- 对比内容（表格形式）
  conclusion TEXT,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_comparisons_user ON public.tool_comparisons(user_id);

-- ==================== 用户收藏表 ====================
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,  -- 'tool', 'case', 'comparison'
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_target ON public.user_bookmarks(target_type, target_id);

-- ==================== 每周推荐表 ====================
CREATE TABLE IF NOT EXISTS public.weekly_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.ai_tools(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,  -- 周一日期
  reason TEXT,
  picked_by UUID REFERENCES public.users(id),  -- 管理员 ID
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tool_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_picks_week ON public.weekly_picks(week_start DESC);

-- ==================== 触发器：更新工具统计 ====================

-- 更新评分统计
CREATE OR REPLACE FUNCTION public.update_tool_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE ai_tools
    SET 
      avg_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM tool_ratings WHERE tool_id = NEW.tool_id),
      rating_count = (SELECT COUNT(*) FROM tool_ratings WHERE tool_id = NEW.tool_id),
      updated_at = NOW()
    WHERE id = NEW.tool_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ai_tools
    SET 
      avg_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM tool_ratings WHERE tool_id = OLD.tool_id), 0),
      rating_count = (SELECT COUNT(*) FROM tool_ratings WHERE tool_id = OLD.tool_id),
      updated_at = NOW()
    WHERE id = OLD.tool_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tool_rating_stats ON public.tool_ratings;
CREATE TRIGGER trigger_update_tool_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.tool_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_rating_stats();

-- 更新体验计数
CREATE OR REPLACE FUNCTION public.update_tool_experience_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ai_tools
    SET experience_count = experience_count + 1, updated_at = NOW()
    WHERE id = NEW.tool_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ai_tools
    SET experience_count = GREATEST(0, experience_count - 1), updated_at = NOW()
    WHERE id = OLD.tool_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tool_experience_count ON public.tool_experiences;
CREATE TRIGGER trigger_update_tool_experience_count
  AFTER INSERT OR DELETE ON public.tool_experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_experience_count();

-- 更新案例计数
CREATE OR REPLACE FUNCTION public.update_tool_case_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE ai_tools
    SET case_count = case_count + 1, updated_at = NOW()
    WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE ai_tools
    SET case_count = case_count + 1, updated_at = NOW()
    WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'approved' AND OLD.status = 'approved' THEN
    UPDATE ai_tools
    SET case_count = GREATEST(0, case_count - 1), updated_at = NOW()
    WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE ai_tools
    SET case_count = GREATEST(0, case_count - 1), updated_at = NOW()
    WHERE id = OLD.tool_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tool_case_count ON public.tool_cases;
CREATE TRIGGER trigger_update_tool_case_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.tool_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_case_count();

-- ==================== RLS 策略 ====================

-- tool_categories 表
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.tool_categories;
CREATE POLICY "Anyone can view active categories" ON public.tool_categories
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.tool_categories;
CREATE POLICY "Admins can manage categories" ON public.tool_categories
  FOR ALL USING (public.is_admin());

-- ai_tools 表
ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active tools" ON public.ai_tools;
CREATE POLICY "Anyone can view active tools" ON public.ai_tools
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage tools" ON public.ai_tools;
CREATE POLICY "Admins can manage tools" ON public.ai_tools
  FOR ALL USING (public.is_admin());

-- tool_ratings 表
ALTER TABLE public.tool_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ratings" ON public.tool_ratings;
CREATE POLICY "Anyone can view ratings" ON public.tool_ratings
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can manage their own ratings" ON public.tool_ratings;
CREATE POLICY "Users can manage their own ratings" ON public.tool_ratings
  FOR ALL USING (auth.uid() = user_id);

-- tool_experiences 表
ALTER TABLE public.tool_experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved experiences" ON public.tool_experiences;
CREATE POLICY "Anyone can view approved experiences" ON public.tool_experiences
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create experiences" ON public.tool_experiences;
CREATE POLICY "Users can create experiences" ON public.tool_experiences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own experiences" ON public.tool_experiences;
CREATE POLICY "Users can update their own experiences" ON public.tool_experiences
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage experiences" ON public.tool_experiences;
CREATE POLICY "Admins can manage experiences" ON public.tool_experiences
  FOR ALL USING (public.is_admin());

-- tool_cases 表
ALTER TABLE public.tool_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved cases" ON public.tool_cases;
CREATE POLICY "Anyone can view approved cases" ON public.tool_cases
  FOR SELECT USING (status IN ('approved', 'featured') OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create cases" ON public.tool_cases;
CREATE POLICY "Users can create cases" ON public.tool_cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cases" ON public.tool_cases;
CREATE POLICY "Users can update their own cases" ON public.tool_cases
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage cases" ON public.tool_cases;
CREATE POLICY "Admins can manage cases" ON public.tool_cases
  FOR ALL USING (public.is_admin());

-- tool_comparisons 表
ALTER TABLE public.tool_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved comparisons" ON public.tool_comparisons;
CREATE POLICY "Anyone can view approved comparisons" ON public.tool_comparisons
  FOR SELECT USING (status IN ('approved', 'featured') OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create comparisons" ON public.tool_comparisons;
CREATE POLICY "Users can create comparisons" ON public.tool_comparisons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comparisons" ON public.tool_comparisons;
CREATE POLICY "Users can update their own comparisons" ON public.tool_comparisons
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage comparisons" ON public.tool_comparisons;
CREATE POLICY "Admins can manage comparisons" ON public.tool_comparisons
  FOR ALL USING (public.is_admin());

-- user_bookmarks 表
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can manage their own bookmarks" ON public.user_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- weekly_picks 表
ALTER TABLE public.weekly_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view weekly picks" ON public.weekly_picks;
CREATE POLICY "Anyone can view weekly picks" ON public.weekly_picks
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage weekly picks" ON public.weekly_picks;
CREATE POLICY "Admins can manage weekly picks" ON public.weekly_picks
  FOR ALL USING (public.is_admin());

-- ==================== 初始化工具分类数据 ====================
INSERT INTO public.tool_categories (name, slug, description, icon, order_index) VALUES
  ('文本生成', 'text-generation', 'AI 写作、对话、文案生成工具', 'MessageSquare', 1),
  ('图像处理', 'image-processing', 'AI 绘画、图像编辑、设计工具', 'Image', 2),
  ('代码辅助', 'code-assistant', 'AI 编程、代码补全、调试工具', 'Code', 3),
  ('数据分析', 'data-analysis', 'AI 数据处理、可视化、分析工具', 'BarChart', 4),
  ('音视频', 'audio-video', 'AI 语音合成、视频编辑工具', 'Video', 5),
  ('效率工具', 'productivity', 'AI 日程管理、笔记、自动化工具', 'Zap', 6),
  ('其他', 'other', '其他 AI 工具', 'Sparkles', 99)
ON CONFLICT (slug) DO NOTHING;

-- ==================== 添加注释 ====================
COMMENT ON TABLE public.tool_categories IS 'AI 工具分类表';
COMMENT ON TABLE public.ai_tools IS 'AI 工具库表';
COMMENT ON TABLE public.tool_ratings IS '用户对工具的评分';
COMMENT ON TABLE public.tool_experiences IS '灵感碎片/使用心得';
COMMENT ON TABLE public.tool_cases IS '应用案例';
COMMENT ON TABLE public.tool_comparisons IS '工具对比';
COMMENT ON TABLE public.user_bookmarks IS '用户收藏';
COMMENT ON TABLE public.weekly_picks IS '每周推荐';
