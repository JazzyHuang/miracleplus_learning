-- =============================================================
-- 052: 审计日志增强
-- 新增 before_data/after_data/changed_fields/description 字段
-- 更新 RPC 函数以支持新参数
-- =============================================================

-- (a) 新增字段
ALTER TABLE miracle_learning_20260209_admin_audit_logs
  ADD COLUMN IF NOT EXISTS before_data JSONB,
  ADD COLUMN IF NOT EXISTS after_data JSONB,
  ADD COLUMN IF NOT EXISTS changed_fields TEXT[],
  ADD COLUMN IF NOT EXISTS description TEXT;

-- (b) 更新 RPC 函数（参数列表变了，需要先 DROP）
DROP FUNCTION IF EXISTS ml_log_admin_action(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION ml_log_admin_action(
  p_admin_id UUID,
  p_action_type VARCHAR(50),
  p_resource_type VARCHAR(50),
  p_resource_id VARCHAR(255) DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO miracle_learning_20260209_admin_audit_logs (
    admin_id, action_type, resource_type, resource_id,
    changes, status, error_message,
    before_data, after_data, changed_fields, description
  ) VALUES (
    p_admin_id, p_action_type, p_resource_type, p_resource_id,
    p_changes, p_status, p_error_message,
    p_before_data, p_after_data, p_changed_fields, p_description
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- (c) 新增索引
CREATE INDEX IF NOT EXISTS ml_idx_audit_logs_resource_type_created
  ON miracle_learning_20260209_admin_audit_logs (resource_type, created_at DESC);

CREATE INDEX IF NOT EXISTS ml_idx_audit_logs_changed_fields
  ON miracle_learning_20260209_admin_audit_logs USING GIN (changed_fields);

-- (d) 注释
COMMENT ON COLUMN miracle_learning_20260209_admin_audit_logs.before_data IS '操作前的数据快照';
COMMENT ON COLUMN miracle_learning_20260209_admin_audit_logs.after_data IS '操作后的数据快照';
COMMENT ON COLUMN miracle_learning_20260209_admin_audit_logs.changed_fields IS '变更的字段名列表';
COMMENT ON COLUMN miracle_learning_20260209_admin_audit_logs.description IS '操作描述（中文）';
