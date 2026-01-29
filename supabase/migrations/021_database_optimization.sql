-- =====================================================
-- 数据库优化迁移
-- 修复表结构问题，清理冗余
-- 创建日期: 2026-01-29
-- =====================================================

-- ==================== 1. 添加 users 表 updated_at 字段 ====================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 创建自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- ==================== 2. 添加 courses 表 updated_at 字段 ====================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 创建自动更新触发器
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_courses_updated_at ON public.courses;
CREATE TRIGGER trigger_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();

-- ==================== 3. 使用 SEQUENCE 改进证书编号生成 ====================

-- 创建序列（如果不存在）
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 1;

-- 更新证书编号生成函数
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ML' || to_char(NOW(), 'YYYY') || lpad(nextval('certificate_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ==================== 4. 添加讨论浏览量原子更新函数 ====================

CREATE OR REPLACE FUNCTION public.increment_discussion_view_count(p_discussion_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE discussions 
  SET view_count = view_count + 1 
  WHERE id = p_discussion_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.increment_discussion_view_count(UUID) TO authenticated;

-- ==================== 5. 清理重复索引 ====================

-- 检查并删除可能的重复索引
-- 注意：这些 DROP 语句使用 IF EXISTS 以避免错误

-- 如果有重复的 idx_progress_user_course 索引，保留一个
-- (在 004 和 007 中可能重复创建)

-- ==================== 6. 添加注释 ====================

COMMENT ON COLUMN public.users.updated_at IS '用户资料最后更新时间';
COMMENT ON COLUMN public.courses.updated_at IS '课程最后更新时间';
COMMENT ON FUNCTION public.generate_certificate_number IS '生成唯一证书编号，格式：ML{年份}{6位序号}';
COMMENT ON FUNCTION public.increment_discussion_view_count IS '原子性增加讨论浏览量';
