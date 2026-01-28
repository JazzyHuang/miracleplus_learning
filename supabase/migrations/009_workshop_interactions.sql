-- =====================================================
-- Workshop 交互功能数据库迁移
-- Phase 2: Workshop 深度功能
-- 创建日期: 2026-01-27
-- =====================================================

-- ==================== 通用点赞表 ====================
-- 支持多种内容类型的点赞（checkin、submission、comment、note 等）
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,  -- 'checkin', 'submission', 'comment', 'note', 'review'
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 确保同一用户对同一目标只能点赞一次
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON public.likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);

-- ==================== 通用评论表 ====================
-- 支持多种内容类型的评论，支持回复（嵌套评论）
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,  -- 'checkin', 'submission', 'workshop', 'course', 'note'
  target_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,  -- 回复的父评论
  content TEXT NOT NULL CHECK (char_length(content) >= 5),  -- 至少5字
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,  -- 软删除
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);

-- ==================== 作品提交表（灵感实验室） ====================
CREATE TABLE IF NOT EXISTS public.workshop_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'document', 'link', 'text')),
  content_url TEXT,  -- 图片/文档 URL
  content_text TEXT,  -- 文本内容
  description TEXT,
  tags TEXT[],
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES public.workshop_submissions(id),  -- 迭代版本关联
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  rejection_reason TEXT,  -- 拒绝原因
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_workshop ON public.workshop_submissions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.workshop_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.workshop_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_parent ON public.workshop_submissions(parent_id);

-- ==================== 讲师申请表 ====================
CREATE TABLE IF NOT EXISTS public.instructor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  outline TEXT,  -- 课程大纲
  duration INTEGER NOT NULL,  -- 预计时长（分钟）
  target_audience TEXT,  -- 目标受众
  prerequisites TEXT,  -- 先决条件
  materials_url TEXT,  -- 准备材料链接
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled')),
  rejection_reason TEXT,
  scheduled_date DATE,  -- 排期日期
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 同一主题不能重复申请（除非被拒绝）
  UNIQUE(user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_instructor_apps_user ON public.instructor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_apps_status ON public.instructor_applications(status);

-- ==================== Workshop 预习材料表 ====================
CREATE TABLE IF NOT EXISTS public.workshop_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('document', 'video', 'link', 'quiz')),
  url TEXT,
  content TEXT,  -- 内嵌内容
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,  -- 是否必读
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_workshop ON public.workshop_materials(workshop_id);

-- ==================== 用户预习完成记录 ====================
CREATE TABLE IF NOT EXISTS public.user_material_progress (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.workshop_materials(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, material_id)
);

-- ==================== Workshop 反馈表 ====================
CREATE TABLE IF NOT EXISTS public.workshop_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content_quality INTEGER CHECK (content_quality >= 1 AND content_quality <= 5),
  instructor_quality INTEGER CHECK (instructor_quality >= 1 AND instructor_quality <= 5),
  suggestions TEXT,
  is_quality BOOLEAN DEFAULT FALSE,  -- 是否为优质反馈
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, workshop_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_workshop ON public.workshop_feedback(workshop_id);

-- ==================== 更新点赞计数的触发器函数 ====================
CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 更新目标的点赞计数
    IF NEW.target_type = 'submission' THEN
      UPDATE workshop_submissions SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'checkin' THEN
      -- checkin 表暂时没有 like_count 字段，可以后续添加
      NULL;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'submission' THEN
      UPDATE workshop_submissions SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
      UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_like_count ON public.likes;
CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_like_count();

-- ==================== 更新评论计数的触发器函数 ====================
CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'submission' THEN
      UPDATE workshop_submissions SET comment_count = comment_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
    IF (TG_OP = 'DELETE' AND OLD.target_type = 'submission') OR 
       (TG_OP = 'UPDATE' AND NEW.target_type = 'submission') THEN
      UPDATE workshop_submissions 
      SET comment_count = GREATEST(0, comment_count - 1) 
      WHERE id = COALESCE(NEW.target_id, OLD.target_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_comment_count ON public.comments;
CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_count();

-- ==================== RLS 策略 ====================

-- likes 表
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
CREATE POLICY "Users can view all likes" ON public.likes
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
CREATE POLICY "Users can create their own likes" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Users can delete their own likes" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- comments 表
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view non-deleted comments" ON public.comments;
CREATE POLICY "Anyone can view non-deleted comments" ON public.comments
  FOR SELECT USING (is_deleted = FALSE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all comments" ON public.comments;
CREATE POLICY "Admins can manage all comments" ON public.comments
  FOR ALL USING (public.is_admin());

-- workshop_submissions 表
ALTER TABLE public.workshop_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved submissions" ON public.workshop_submissions;
CREATE POLICY "Anyone can view approved submissions" ON public.workshop_submissions
  FOR SELECT USING (status IN ('approved', 'featured') OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create submissions" ON public.workshop_submissions;
CREATE POLICY "Users can create submissions" ON public.workshop_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending submissions" ON public.workshop_submissions;
CREATE POLICY "Users can update their own pending submissions" ON public.workshop_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage all submissions" ON public.workshop_submissions;
CREATE POLICY "Admins can manage all submissions" ON public.workshop_submissions
  FOR ALL USING (public.is_admin());

-- instructor_applications 表
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own applications" ON public.instructor_applications;
CREATE POLICY "Users can view their own applications" ON public.instructor_applications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create applications" ON public.instructor_applications;
CREATE POLICY "Users can create applications" ON public.instructor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their pending applications" ON public.instructor_applications;
CREATE POLICY "Users can update their pending applications" ON public.instructor_applications
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage all applications" ON public.instructor_applications;
CREATE POLICY "Admins can manage all applications" ON public.instructor_applications
  FOR ALL USING (public.is_admin());

-- workshop_materials 表
ALTER TABLE public.workshop_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view materials" ON public.workshop_materials;
CREATE POLICY "Anyone can view materials" ON public.workshop_materials
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage materials" ON public.workshop_materials;
CREATE POLICY "Admins can manage materials" ON public.workshop_materials
  FOR ALL USING (public.is_admin());

-- user_material_progress 表
ALTER TABLE public.user_material_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_material_progress;
CREATE POLICY "Users can view their own progress" ON public.user_material_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own progress" ON public.user_material_progress;
CREATE POLICY "Users can create their own progress" ON public.user_material_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- workshop_feedback 表
ALTER TABLE public.workshop_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.workshop_feedback;
CREATE POLICY "Users can view their own feedback" ON public.workshop_feedback
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can create feedback" ON public.workshop_feedback;
CREATE POLICY "Users can create feedback" ON public.workshop_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all feedback" ON public.workshop_feedback;
CREATE POLICY "Admins can view all feedback" ON public.workshop_feedback
  FOR SELECT USING (public.is_admin());

-- ==================== 添加注释 ====================
COMMENT ON TABLE public.likes IS '通用点赞表，支持多种内容类型';
COMMENT ON TABLE public.comments IS '通用评论表，支持嵌套回复';
COMMENT ON TABLE public.workshop_submissions IS '作品提交表（灵感实验室）';
COMMENT ON TABLE public.instructor_applications IS '讲师申请表';
COMMENT ON TABLE public.workshop_materials IS 'Workshop 预习材料表';
COMMENT ON TABLE public.user_material_progress IS '用户预习完成记录';
COMMENT ON TABLE public.workshop_feedback IS 'Workshop 反馈表';
