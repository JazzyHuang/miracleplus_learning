-- 045: 补全高频查询缺失的复合索引
-- 审计发现多个高频查询路径缺少复合索引，大数据量下可能导致全表扫描

-- 用户课时进度：按 (user_id, lesson_id) 查询（每次课时页面加载）
CREATE INDEX IF NOT EXISTS ml_idx_user_lesson_progress_user_lesson
  ON miracle_learning_20260209_user_lesson_progress(user_id, lesson_id);

-- 用户课时进度：按 updated_at 排序（"继续学习"恢复卡片查询）
CREATE INDEX IF NOT EXISTS ml_idx_user_lesson_progress_user_updated
  ON miracle_learning_20260209_user_lesson_progress(user_id, updated_at DESC);

-- 积分流水：按 user_id + created_at 排序（个人积分历史页面）
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_user_created
  ON miracle_learning_20260209_point_transactions(user_id, created_at DESC);

-- 讨论列表：按 status + created_at 排序（社区讨论列表页面）
CREATE INDEX IF NOT EXISTS ml_idx_discussions_status_created
  ON miracle_learning_20260209_discussions(status, created_at DESC);
