-- ============================================================
-- 第一阶段：生产就绪 - 分布式速率限制系统
-- Migration: 036_distributed_rate_limiting.sql
--
-- 此迁移创建分布式速率限制系统所需的数据表和 RPC 函数
-- 使用 Token Bucket 算法实现跨实例的速率限制
-- ============================================================

-- 1. 创建速率限制条目表
-- 此表存储每个速率限制键的 token bucket 状态
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_rate_limit_entries (
    key TEXT PRIMARY KEY,
    tokens NUMERIC NOT NULL DEFAULT 0,
    last_update TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE public.miracle_learning_20260209_rate_limit_entries IS '分布式速率限制条目表 - 使用 Token Bucket 算法';

-- 添加列注释
COMMENT ON COLUMN public.miracle_learning_20260209_rate_limit_entries.key IS '速率限制键（通常是 IP 地址或用户 ID）';
COMMENT ON COLUMN public.miracle_learning_20260209_rate_limit_entries.tokens IS '当前可用的 token 数量';
COMMENT ON COLUMN public.miracle_learning_20260209_rate_limit_entries.last_update IS '上次更新时间';

-- 2. 创建索引以优化过期条目清理
CREATE INDEX IF NOT EXISTS ml_idx_rate_limit_last_update
ON public.miracle_learning_20260209_rate_limit_entries(last_update);

-- 3. 启用 RLS（行级安全）
ALTER TABLE public.miracle_learning_20260209_rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
-- 服务角色可以完全访问（用于速率限制检查）
CREATE POLICY "[ML] Service role full access on rate_limit_entries"
ON public.miracle_learning_20260209_rate_limit_entries
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- 已认证用户不能直接访问（只能通过 RPC 函数）
CREATE POLICY "[ML] No direct access for authenticated users"
ON public.miracle_learning_20260209_rate_limit_entries
FOR ALL
TO authenticated
USING (FALSE)
WITH CHECK (FALSE);

-- 5. 创建速率限制检查 RPC 函数
-- 此函数实现 Token Bucket 算法，使用行级锁确保原子性
CREATE OR REPLACE FUNCTION public.ml_check_rate_limit(
    p_key TEXT,
    p_max_tokens INTEGER,
    p_refill_rate NUMERIC,
    p_window_ms INTEGER,
    p_current_time TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry RECORD;
    v_tokens NUMERIC;
    v_last_update TIMESTAMPTZ;
    v_elapsed_ms NUMERIC;
    v_tokens_to_add NUMERIC;
    v_reset_at TIMESTAMPTZ;
    v_allowed BOOLEAN;
    v_remaining INTEGER;
BEGIN
    -- 获取当前条目，使用行级锁防止并发修改
    SELECT tokens, last_update
    INTO v_tokens, v_last_update
    FROM public.miracle_learning_20260209_rate_limit_entries
    WHERE key = p_key
    FOR UPDATE;

    -- 计算经过的时间（毫秒）
    v_elapsed_ms := EXTRACT(EPOCH FROM (p_current_time - v_last_update)) * 1000;

    -- 如果是新条目或经过时间超过窗口期
    IF v_tokens IS NULL THEN
        -- 新条目，使用最大 tokens
        v_tokens := p_max_tokens::NUMERIC;
        v_last_update := p_current_time;
    ELSIF v_elapsed_ms >= p_window_ms THEN
        -- 窗口期已过，重置为最大 tokens
        v_tokens := p_max_tokens::NUMERIC;
        v_last_update := p_current_time;
    ELSE
        -- 计算应该恢复的 tokens
        v_tokens_to_add := v_elapsed_ms * p_refill_rate;
        v_tokens := LEAST(p_max_tokens::NUMERIC, v_tokens + v_tokens_to_add);
        v_last_update := p_current_time;
    END IF;

    -- 检查是否有足够的 tokens
    IF v_tokens >= 1 THEN
        v_allowed := TRUE;
        v_tokens := v_tokens - 1;
        v_remaining := FLOOR(v_tokens)::INTEGER;
    ELSE
        v_allowed := FALSE;
        v_remaining := 0;
    END IF;

    -- 计算完全恢复的时间
    -- 如果 tokens 已满，重置时间为当前时间
    -- 否则计算需要多少毫秒来恢复 1 个 token
    IF v_tokens >= p_max_tokens::NUMERIC THEN
        v_reset_at := p_current_time;
    ELSIF v_allowed THEN
        -- 计算恢复到最大值需要的时间
        v_reset_at := p_current_time + make_interval(secs => ((p_max_tokens - v_tokens) / p_refill_rate));
    ELSE
        -- 计算恢复 1 个 token 需要的时间
        v_reset_at := p_current_time + make_interval(secs => (1 / p_refill_rate));
    END IF;

    -- 更新或插入条目
    INSERT INTO public.miracle_learning_20260209_rate_limit_entries (key, tokens, last_update)
    VALUES (p_key, v_tokens, p_current_time)
    ON CONFLICT (key) DO UPDATE SET
        tokens = EXCLUDED.tokens,
        last_update = EXCLUDED.last_update;

    -- 返回结果
    RETURN json_build_object(
        'allowed', v_allowed,
        'remaining', v_remaining,
        'reset_at', v_reset_at
    );
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION public.ml_check_rate_limit IS '分布式速率限制检查 - 使用 Token Bucket 算法，确保原子性';

-- 6. 创建清理过期条目的函数
-- 此函数定期清理超过 24 小时未更新的条目
CREATE OR REPLACE FUNCTION public.ml_cleanup_rate_limit_entries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- 删除超过 24 小时未更新的条目
    DELETE FROM public.miracle_learning_20260209_rate_limit_entries
    WHERE last_update < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.ml_cleanup_rate_limit_entries IS '清理过期的速率限制条目（超过 24 小时未更新）';

-- 7. 授予执行权限
GRANT EXECUTE ON FUNCTION public.ml_check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.ml_cleanup_rate_limit_entries TO service_role;

-- 8. 创建 pg_cron 任务（如果 pg_cron 可用）
-- 每小时清理一次过期条目
-- 注意：pg_cron 可能不可用，所以使用 DO 块捕获错误
DO $$
BEGIN
    -- 尝试创建 cron 任务
    PERFORM cron.schedule(
        'ml-cleanup-rate-limit',
        '0 * * * *', -- 每小时执行
        'SELECT public.ml_cleanup_rate_limit_entries();'
    );
EXCEPTION WHEN OTHERS THEN
    -- pg_cron 不可用，记录警告但不失败
    RAISE WARNING 'pg_cron is not available, rate limit cleanup will not be automated';
END $$;

-- ============================================================
-- 验证脚本
-- ============================================================

-- 测试速率限制函数
-- SELECT * FROM ml_check_rate_limit('test-ip', 10, 0.1, 1000, NOW());

-- 查看当前条目数
-- SELECT COUNT(*) FROM miracle_learning_20260209_rate_limit_entries;

-- 手动清理过期条目
-- SELECT ml_cleanup_rate_limit_entries();
