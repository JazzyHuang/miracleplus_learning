-- =============================================================
-- 057: Database Fixes
-- Redundant index cleanup + leaderboard refresh concurrent protection
-- =============================================================

-- =============================================
-- 1. 冗余索引清理
-- ml_idx_progress_user 被 054 的 ml_idx_pt_user_created_action 覆盖
-- ml_idx_point_transactions_user_id 同理
-- =============================================
DROP INDEX IF EXISTS ml_idx_progress_user;
DROP INDEX IF EXISTS ml_idx_point_transactions_user_id;

-- =============================================
-- 2. ml_refresh_leaderboard: 添加并发保护
-- 防止多个 pg_cron 或手动调用同时刷新物化视图
-- =============================================
DROP FUNCTION IF EXISTS public.ml_refresh_leaderboard();
CREATE OR REPLACE FUNCTION public.ml_refresh_leaderboard()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.ml_is_admin_fast() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  -- Advisory lock 防止并发刷新（事务级，自动释放）
  IF NOT pg_try_advisory_xact_lock(hashtext('ml_refresh_leaderboard')) THEN
    RAISE NOTICE 'Leaderboard refresh already in progress, skipping';
    RETURN;
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY ml_leaderboard_view;
END;
$$;
