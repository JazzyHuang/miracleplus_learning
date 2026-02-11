-- ============================================================================
-- Migration 034: Fix Leaderboard View RLS and Access
-- ============================================================================
-- Problem: The leaderboard materialized view was missing proper permissions
-- for authenticated users, causing rank queries to fail.
--
-- Solution: Grant SELECT access to the leaderboard view for authenticated
-- and anon users.
-- ============================================================================

BEGIN;

-- 1. 为排行榜视图授予访问权限
-- 物化视图需要显式授权
GRANT SELECT ON public.ml_leaderboard_view TO authenticated;
GRANT SELECT ON public.ml_leaderboard_view TO anon;

COMMIT;
