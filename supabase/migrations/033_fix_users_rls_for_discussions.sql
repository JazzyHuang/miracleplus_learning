-- ============================================================================
-- Migration 033: Fix Users RLS for Discussions
-- ============================================================================
-- Problem: Users table RLS was too restrictive, blocking discussions list from
-- showing user profile information (name, avatar_url) for discussion authors.
--
-- Solution: Create a secure view containing only public user information
-- (id, name, avatar_url) that can be accessed by authenticated users for
-- displaying user profiles in discussions, comments, etc.
-- ============================================================================

BEGIN;

-- 1. 创建用户公开信息的安全视图
-- 这个视图只包含可以在公开场合显示的字段，不包含敏感信息如 email
CREATE OR REPLACE VIEW public.ml_user_public_profiles AS
SELECT
  id,
  name,
  avatar_url,
  created_at
FROM public.miracle_learning_20260209_users;

-- 2. 为公开视图授予访问权限
GRANT SELECT ON public.ml_user_public_profiles TO authenticated;
GRANT SELECT ON public.ml_user_public_profiles TO anon;

COMMIT;
