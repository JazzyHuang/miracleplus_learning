-- =============================================================
-- 053: 修复审计日志 RLS 策略 + 添加 users 表外键
--
-- 问题 1: 036b 的 "immutable" 策略使用 FOR ALL + USING(false)，
--         这会阻止 authenticated 用户的 INSERT（虽然 SECURITY DEFINER
--         函数绕过了 RLS，但客户端直接查询时 SELECT 策略可能受影响）。
--         更重要的是，原始 035 的 INSERT 策略只允许 service_role，
--         但 036b 的 FOR ALL 策略与之冲突。
--
-- 问题 2: admin_audit_logs.admin_id 只有指向 auth.users 的外键，
--         没有指向 miracle_learning_20260209_users 的外键，
--         导致 PostgREST 的 embedded resource JOIN 失败。
-- =============================================================

-- (a) 删除有问题的 "immutable" 策略
-- 该策略用 FOR ALL + USING(false) 会干扰 SELECT 和 INSERT
DROP POLICY IF EXISTS "[ML] Audit logs are immutable"
ON miracle_learning_20260209_admin_audit_logs;

-- (b) 重新创建更精确的不可变策略（只禁止 UPDATE 和 DELETE）
CREATE POLICY "[ML] Audit logs no update"
ON miracle_learning_20260209_admin_audit_logs
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "[ML] Audit logs no delete"
ON miracle_learning_20260209_admin_audit_logs
FOR DELETE
TO authenticated
USING (false);

-- (c) 确保 admin SELECT 策略使用优化的 (select ml_is_admin()) 写法
DROP POLICY IF EXISTS "[ML] Admins can view all audit logs"
ON miracle_learning_20260209_admin_audit_logs;

CREATE POLICY "[ML] Admins can view all audit logs"
ON miracle_learning_20260209_admin_audit_logs
FOR SELECT
TO authenticated
USING ((select public.ml_is_admin()));

-- (d) 确保 service_role INSERT 策略存在
DROP POLICY IF EXISTS "[ML] Only service role can insert audit logs"
ON miracle_learning_20260209_admin_audit_logs;

CREATE POLICY "[ML] Only service role can insert audit logs"
ON miracle_learning_20260209_admin_audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- (e) 添加从 admin_id 到 miracle_learning_20260209_users 的外键
-- 这样 PostgREST 才能通过 embedded resource 语法 JOIN 用户信息
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ml_fk_audit_logs_admin_users'
    AND table_name = 'miracle_learning_20260209_admin_audit_logs'
  ) THEN
    ALTER TABLE miracle_learning_20260209_admin_audit_logs
      ADD CONSTRAINT ml_fk_audit_logs_admin_users
      FOREIGN KEY (admin_id)
      REFERENCES miracle_learning_20260209_users(id)
      ON DELETE CASCADE;
  END IF;
END
$$;
