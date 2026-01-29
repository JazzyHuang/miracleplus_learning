-- =====================================================
-- 修复积分系统权限问题
-- 问题：
-- 1. 之前的迁移文件中表名使用错误（user_point_balances 应为 user_point_balance）
-- 2. leaderboard_view 物化视图缺少 SELECT 权限
-- 3. 部分表缺少必要的权限授予
-- 创建日期: 2026-01-29
-- =====================================================

-- ==================== 授予 user_point_balance 表权限 ====================
-- 确保表存在（直接授予，不需要检查）
GRANT SELECT ON public.user_point_balance TO authenticated;
GRANT SELECT ON public.user_point_balance TO anon;  -- 排行榜需要
GRANT INSERT, UPDATE ON public.user_point_balance TO authenticated;

-- ==================== 授予 point_transactions 表权限 ====================
GRANT SELECT ON public.point_transactions TO authenticated;
GRANT INSERT ON public.point_transactions TO authenticated;

-- ==================== 授予 user_streaks 表权限 ====================
GRANT SELECT ON public.user_streaks TO authenticated;
GRANT SELECT ON public.user_streaks TO anon;  -- 排行榜需要
GRANT INSERT, UPDATE ON public.user_streaks TO authenticated;

-- ==================== 授予 badges 表权限 ====================
GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT ON public.badges TO anon;

-- ==================== 授予 user_badges 表权限 ====================
GRANT SELECT ON public.user_badges TO authenticated;
GRANT SELECT ON public.user_badges TO anon;  -- 查看他人徽章需要
GRANT INSERT ON public.user_badges TO authenticated;

-- ==================== 授予 leaderboard_view 权限 ====================
-- 这是关键的修复：排行榜视图需要 SELECT 权限
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- ==================== 授予 point_rules 表权限 ====================
GRANT SELECT ON public.point_rules TO authenticated;
GRANT SELECT ON public.point_rules TO anon;

-- ==================== 确保 RPC 函数有正确的执行权限 ====================
-- 重新授予执行权限以确保正确
GRANT EXECUTE ON FUNCTION public.add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard() TO authenticated;

-- ==================== 授予辅助函数执行权限 ====================
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;

-- ==================== 确保 leaderboard_view 可以访问相关表 ====================
-- 物化视图需要基础表的 SELECT 权限来刷新
GRANT SELECT ON public.users TO postgres;  -- postgres 用户用于刷新物化视图
GRANT SELECT ON public.user_point_balance TO postgres;
GRANT SELECT ON public.user_streaks TO postgres;
GRANT SELECT ON public.user_badges TO postgres;

-- ==================== 创建管理员刷新排行榜的权限 ====================
-- 允许 authenticated 用户刷新排行榜（通过 RPC）
-- 已经在 008 中定义，这里确保权限正确

-- ==================== 添加注释 ====================
COMMENT ON FUNCTION public.add_user_points IS '原子性添加用户积分，自动处理每日上限';
COMMENT ON FUNCTION public.update_user_streak IS '更新用户连续登录记录并发放相应奖励';
COMMENT ON FUNCTION public.refresh_leaderboard IS '刷新排行榜物化视图';
