-- =============================================================
-- 管理员审计日志表
-- 记录所有管理员操作，支持追溯和审计
-- =============================================================

-- 审计日志表
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS ml_idx_admin_logs_admin_id ON miracle_learning_20260209_admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_admin_logs_resource ON miracle_learning_20260209_admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS ml_idx_admin_logs_action_type ON miracle_learning_20260209_admin_audit_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_admin_logs_created_at ON miracle_learning_20260209_admin_audit_logs(created_at DESC);

-- RLS 策略
ALTER TABLE miracle_learning_20260209_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以查看审计日志
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'miracle_learning_20260209_admin_audit_logs'
    AND policyname = '[ML] Admins can view all audit logs'
  ) THEN
    CREATE POLICY "[ML] Admins can view all audit logs"
    ON miracle_learning_20260209_admin_audit_logs
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    );
  END IF;
END
$$;

-- 只有 service_role 可以插入（通过 RPC 函数）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'miracle_learning_20260209_admin_audit_logs'
    AND policyname = '[ML] Only service role can insert audit logs'
  ) THEN
    CREATE POLICY "[ML] Only service role can insert audit logs"
    ON miracle_learning_20260209_admin_audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);
  END IF;
END
$$;

-- 审计日志记录函数
CREATE OR REPLACE FUNCTION ml_log_admin_action(
  p_admin_id UUID,
  p_action_type VARCHAR(50),
  p_resource_type VARCHAR(50),
  p_resource_id VARCHAR(255) DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO miracle_learning_20260209_admin_audit_logs (
    admin_id, action_type, resource_type, resource_id,
    changes, status, error_message
  ) VALUES (
    p_admin_id, p_action_type, p_resource_type, p_resource_id,
    p_changes, p_status, p_error_message
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 添加注释
COMMENT ON TABLE miracle_learning_20260209_admin_audit_logs IS '管理员操作审计日志表';
COMMENT ON FUNCTION ml_log_admin_action IS '记录管理员操作到审计日志';
