-- 检查邮箱是否存在的 RPC 函数
-- 用于登录时检测用户是否已注册
-- 创建日期: 2026-01-28

-- ==================== 邮箱存在检查函数 ====================
-- 此函数用于在登录失败时检查邮箱是否已注册
-- 返回 boolean：true 表示邮箱已注册，false 表示未注册
-- 使用 SECURITY DEFINER 以绕过 RLS 限制

CREATE OR REPLACE FUNCTION public.check_email_exists(target_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 检查 public.users 表中是否存在该邮箱
  -- 注意：此函数仅返回布尔值，不暴露其他用户信息
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = target_email
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 添加函数注释
COMMENT ON FUNCTION public.check_email_exists(TEXT) IS '检查邮箱是否已注册。用于登录失败时判断是否需要引导用户去注册。使用 SECURITY DEFINER 绕过 RLS 限制。';

-- 授予匿名用户和已认证用户执行权限
-- 匿名用户需要此权限以在登录前检查邮箱
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated;
