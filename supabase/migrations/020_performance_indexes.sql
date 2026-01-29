-- =====================================================
-- 性能优化索引迁移
-- 添加缺失的关键索引以提升查询性能
-- 创建日期: 2026-01-29
-- 
-- 注意：此迁移文件设计为可重复执行（幂等性）
-- =====================================================

-- ==================== discussions 表索引 ====================

-- 状态和置顶排序索引（用于讨论列表查询）
CREATE INDEX IF NOT EXISTS idx_discussions_status_pinned
ON public.discussions(status, is_pinned DESC, created_at DESC);

-- 标签 GIN 索引（用于标签搜索）
CREATE INDEX IF NOT EXISTS idx_discussions_tags
ON public.discussions USING GIN(tags);

-- 热门排序索引
CREATE INDEX IF NOT EXISTS idx_discussions_popular
ON public.discussions(status, is_pinned DESC, comment_count DESC);

-- ==================== ai_tools 表索引 ====================

-- 活跃工具和排序索引
CREATE INDEX IF NOT EXISTS idx_ai_tools_active_featured
ON public.ai_tools(is_active, is_featured DESC, avg_rating DESC);

-- 分类筛选索引
CREATE INDEX IF NOT EXISTS idx_ai_tools_category
ON public.ai_tools(category_id, is_active);

-- 标签 GIN 索引
CREATE INDEX IF NOT EXISTS idx_ai_tools_tags
ON public.ai_tools USING GIN(tags);

-- ==================== tool_experiences 表索引 ====================

-- 工具和状态索引
CREATE INDEX IF NOT EXISTS idx_tool_experiences_tool_status
ON public.tool_experiences(tool_id, status, is_featured DESC, like_count DESC);

-- 用户索引
CREATE INDEX IF NOT EXISTS idx_tool_experiences_user
ON public.tool_experiences(user_id, created_at DESC);

-- ==================== tool_cases 表索引 ====================

-- 状态和排序索引
CREATE INDEX IF NOT EXISTS idx_tool_cases_status
ON public.tool_cases(status, is_featured DESC, like_count DESC);

-- 工具 ID 索引
CREATE INDEX IF NOT EXISTS idx_tool_cases_tool
ON public.tool_cases(tool_id, status);

-- 标签 GIN 索引
CREATE INDEX IF NOT EXISTS idx_tool_cases_tags
ON public.tool_cases USING GIN(tags);

-- ==================== user_bookmarks 表索引 ====================

-- 用户和类型联合索引
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_type
ON public.user_bookmarks(user_id, target_type);

-- ==================== point_transactions 表索引 ====================

-- 用户每日积分查询索引（已存在但确保有）
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_action_date
ON public.point_transactions(user_id, action_type, created_at DESC);

-- ==================== user_invitations 表索引 ====================

-- 被邀请人索引
CREATE INDEX IF NOT EXISTS idx_user_invitations_invitee
ON public.user_invitations(invitee_id);

-- 邀请码索引（可能已存在，使用 IF NOT EXISTS 确保幂等）
CREATE INDEX IF NOT EXISTS idx_user_invitations_code
ON public.user_invitations(invite_code);

-- ==================== comments 表索引（通用评论表） ====================
-- 注意：系统使用通用的 comments 表，通过 target_type 区分评论类型
-- 包括讨论评论 (target_type='discussion') 等

-- 目标类型和目标 ID 索引（用于获取特定讨论/帖子的评论）
CREATE INDEX IF NOT EXISTS idx_comments_target
ON public.comments(target_type, target_id, created_at DESC);

-- 用户评论索引
CREATE INDEX IF NOT EXISTS idx_comments_user
ON public.comments(user_id, created_at DESC);

-- ==================== course_notes 表索引 ====================

-- 课程笔记搜索索引（全文搜索）
-- 注意：使用 'simple' 配置，对中文需要使用专门的分词插件
CREATE INDEX IF NOT EXISTS idx_course_notes_search
ON public.course_notes USING GIN(to_tsvector('simple', title || ' ' || COALESCE(content, '')));

-- ==================== 添加注释 ====================
COMMENT ON INDEX idx_discussions_status_pinned IS '讨论列表查询优化索引';
COMMENT ON INDEX idx_discussions_tags IS '讨论标签搜索 GIN 索引';
COMMENT ON INDEX idx_ai_tools_active_featured IS 'AI 工具列表查询优化索引';
COMMENT ON INDEX idx_tool_experiences_tool_status IS '工具灵感碎片查询优化索引';
COMMENT ON INDEX idx_comments_target IS '评论目标查询优化索引（适用于讨论、帖子等）';
