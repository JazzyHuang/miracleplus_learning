-- 050: Audit log retention policy
-- Automatically clean up audit logs older than 90 days
-- Should be scheduled via pg_cron: SELECT cron.schedule('ml-audit-cleanup', '0 3 * * 0', $$SELECT ml_cleanup_old_audit_logs()$$);

CREATE OR REPLACE FUNCTION ml_cleanup_old_audit_logs(
  p_retention_days INT DEFAULT 90
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM miracle_learning_20260209_admin_audit_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add index on created_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS ml_idx_audit_logs_created_at
  ON miracle_learning_20260209_admin_audit_logs (created_at);
