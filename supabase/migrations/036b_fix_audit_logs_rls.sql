-- =============================================================
-- Migration 036: Fix Admin Audit Logs RLS Policy
-- =============================================================
-- 修复 admin_audit_logs 表的 RLS 策略，使其使用安全的 ml_is_admin() 函数
-- 而不是不安全的 raw_user_meta_data->>'role'
-- =============================================================

-- 删除不安全的策略
DROP POLICY IF EXISTS "[ML] Admins can view all audit logs"
ON miracle_learning_20260209_admin_audit_logs;

-- 创建使用 ml_is_admin() 的安全策略
CREATE POLICY "[ML] Admins can view all audit logs"
ON miracle_learning_20260209_admin_audit_logs
FOR SELECT
TO authenticated
USING (public.ml_is_admin());

-- 确保审计日志不可被修改（DELETE/UPDATE）
DROP POLICY IF EXISTS "[ML] Audit logs are immutable"
ON miracle_learning_20260209_admin_audit_logs;

CREATE POLICY "[ML] Audit logs are immutable"
ON miracle_learning_20260209_admin_audit_logs
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
