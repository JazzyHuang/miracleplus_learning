-- =====================================================
-- 创建原子性更新课时阅读时间的函数
-- 
-- 问题：API 端点使用 upsert 更新 time_spent，但 upsert 会直接覆盖
--       现有值，可能导致较小的值覆盖较大的累积值。
-- 
-- 解决方案：创建数据库函数，使用 GREATEST 确保只保留最大值。
-- 
-- 创建日期: 2026-01-29
-- =====================================================

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS public.upsert_lesson_time_spent(UUID, UUID, UUID, INTEGER);

/**
 * 原子性更新课时阅读时间
 * 
 * 只有当新的 time_spent 大于现有值时才会更新，
 * 防止并发请求或 stale 数据覆盖更高的累积值。
 * 
 * @param p_user_id 用户 ID
 * @param p_lesson_id 课时 ID
 * @param p_course_id 课程 ID
 * @param p_time_spent 新的阅读时间（秒）
 * @returns 更新后的 time_spent 值
 */
CREATE FUNCTION public.upsert_lesson_time_spent(
  p_user_id UUID,
  p_lesson_id UUID,
  p_course_id UUID,
  p_time_spent INTEGER
) RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result INTEGER;
BEGIN
  -- 权限检查：只允许本人更新
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot update other user progress';
  END IF;

  -- 使用 INSERT ... ON CONFLICT 实现原子性条件更新
  INSERT INTO user_lesson_progress (
    user_id,
    lesson_id,
    course_id,
    time_spent,
    updated_at
  )
  VALUES (
    p_user_id,
    p_lesson_id,
    p_course_id,
    p_time_spent,
    NOW()
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET 
    -- 只保留较大的值
    time_spent = GREATEST(user_lesson_progress.time_spent, EXCLUDED.time_spent),
    updated_at = NOW()
  RETURNING time_spent INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.upsert_lesson_time_spent(UUID, UUID, UUID, INTEGER) TO authenticated;

-- 添加注释
COMMENT ON FUNCTION public.upsert_lesson_time_spent IS 
  '原子性更新课时阅读时间，使用 GREATEST 确保只保留最大值，防止 stale 数据覆盖';
