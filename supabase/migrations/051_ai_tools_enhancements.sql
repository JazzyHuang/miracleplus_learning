-- 051: AI 工具页面增强
-- 新增字段、索引、触发器，修复 experience_count 触发器 Bug

-- (a) ai_tools 表新增字段
ALTER TABLE miracle_learning_20260209_ai_tools
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS pros TEXT[],
  ADD COLUMN IF NOT EXISTS cons TEXT[],
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0;

-- (b) 索引
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_like_count
  ON miracle_learning_20260209_ai_tools (like_count DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_comment_count
  ON miracle_learning_20260209_ai_tools (comment_count DESC) WHERE is_active = TRUE;
-- 评论查询优化
CREATE INDEX IF NOT EXISTS ml_idx_comments_target_created
  ON miracle_learning_20260209_comments (target_type, target_id, created_at DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS ml_idx_comments_target_likes
  ON miracle_learning_20260209_comments (target_type, target_id, like_count DESC)
  WHERE is_deleted = FALSE AND parent_id IS NULL;

-- (c) 点赞计数触发器（分离 INSERT/DELETE）
CREATE OR REPLACE FUNCTION ml_update_ai_tool_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE miracle_learning_20260209_ai_tools SET like_count = like_count + 1 WHERE id = NEW.target_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE miracle_learning_20260209_ai_tools SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ml_trigger_ai_tool_like_insert ON miracle_learning_20260209_likes;
CREATE TRIGGER ml_trigger_ai_tool_like_insert
  AFTER INSERT ON miracle_learning_20260209_likes
  FOR EACH ROW WHEN (NEW.target_type = 'ai_tool')
  EXECUTE FUNCTION ml_update_ai_tool_like_count();

DROP TRIGGER IF EXISTS ml_trigger_ai_tool_like_delete ON miracle_learning_20260209_likes;
CREATE TRIGGER ml_trigger_ai_tool_like_delete
  AFTER DELETE ON miracle_learning_20260209_likes
  FOR EACH ROW WHEN (OLD.target_type = 'ai_tool')
  EXECUTE FUNCTION ml_update_ai_tool_like_count();

-- (d) 评论计数触发器（INSERT/DELETE/软删除 UPDATE）
CREATE OR REPLACE FUNCTION ml_update_ai_tool_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'ai_tool' THEN
    UPDATE miracle_learning_20260209_ai_tools SET comment_count = comment_count + 1 WHERE id = NEW.target_id;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'ai_tool' THEN
    UPDATE miracle_learning_20260209_ai_tools SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.target_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.target_type = 'ai_tool' AND OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
    UPDATE miracle_learning_20260209_ai_tools SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.target_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ml_trigger_ai_tool_comment_change ON miracle_learning_20260209_comments;
CREATE TRIGGER ml_trigger_ai_tool_comment_change
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON miracle_learning_20260209_comments
  FOR EACH ROW EXECUTE FUNCTION ml_update_ai_tool_comment_count();

-- (e) 收藏计数触发器
CREATE OR REPLACE FUNCTION ml_update_ai_tool_bookmark_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE miracle_learning_20260209_ai_tools SET bookmark_count = bookmark_count + 1 WHERE id = NEW.target_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE miracle_learning_20260209_ai_tools SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.target_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ml_trigger_ai_tool_bookmark_insert ON miracle_learning_20260209_user_bookmarks;
CREATE TRIGGER ml_trigger_ai_tool_bookmark_insert
  AFTER INSERT ON miracle_learning_20260209_user_bookmarks
  FOR EACH ROW WHEN (NEW.target_type = 'tool')
  EXECUTE FUNCTION ml_update_ai_tool_bookmark_count();

DROP TRIGGER IF EXISTS ml_trigger_ai_tool_bookmark_delete ON miracle_learning_20260209_user_bookmarks;
CREATE TRIGGER ml_trigger_ai_tool_bookmark_delete
  AFTER DELETE ON miracle_learning_20260209_user_bookmarks
  FOR EACH ROW WHEN (OLD.target_type = 'tool')
  EXECUTE FUNCTION ml_update_ai_tool_bookmark_count();

-- (f) 修复 Bug：experience_count 触发器不过滤 status
CREATE OR REPLACE FUNCTION ml_update_tool_experience_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE miracle_learning_20260209_ai_tools SET experience_count = experience_count + 1 WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE miracle_learning_20260209_ai_tools SET experience_count = experience_count + 1 WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'approved' AND OLD.status = 'approved' THEN
    UPDATE miracle_learning_20260209_ai_tools SET experience_count = GREATEST(0, experience_count - 1) WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE miracle_learning_20260209_ai_tools SET experience_count = GREATEST(0, experience_count - 1) WHERE id = OLD.tool_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ml_trigger_update_tool_exp_count ON miracle_learning_20260209_tool_experiences;
CREATE TRIGGER ml_trigger_update_tool_exp_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON miracle_learning_20260209_tool_experiences
  FOR EACH ROW EXECUTE FUNCTION ml_update_tool_experience_count();
