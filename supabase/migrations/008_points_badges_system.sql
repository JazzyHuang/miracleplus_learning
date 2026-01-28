-- =====================================================
-- 积分勋章系统数据库迁移
-- Phase 1: 核心积分与个人中心基础设施
-- 创建日期: 2026-01-27
-- =====================================================

-- ==================== 积分规则配置表 ====================
-- 存储可配置的积分规则，便于管理和调整
CREATE TABLE IF NOT EXISTS public.point_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,  -- 行为类型标识
  points INTEGER NOT NULL DEFAULT 0,  -- 积分值
  daily_limit INTEGER,  -- 每日上限（NULL 表示无限制）
  description TEXT,  -- 规则描述
  is_active BOOLEAN DEFAULT TRUE,  -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认积分规则
INSERT INTO public.point_rules (action_type, points, daily_limit, description) VALUES
  -- 基础参与
  ('PROFILE_COMPLETE', 20, 1, '完善个人资料（首次）'),
  ('DAILY_LOGIN', 5, 1, '每日登录'),
  ('WEEKLY_STREAK', 50, NULL, '连续7天登录'),
  ('MONTHLY_STREAK', 200, NULL, '连续30天登录'),
  ('INVITE_USER', 80, NULL, '邀请新人注册并完成首次学习'),
  
  -- Workshop
  ('WORKSHOP_CHECKIN', 50, NULL, '签到打卡'),
  ('WORKSHOP_SUBMISSION', 200, NULL, '作品提交'),
  ('WORKSHOP_PREVIEW', 30, NULL, '完成预习'),
  ('WORKSHOP_REALTIME', 10, 5, '现场互动（投票/问答）'),
  ('WORKSHOP_REVIEW', 50, NULL, '课后复盘'),
  ('WORKSHOP_ITERATION', 100, NULL, '作品迭代'),
  ('WORKSHOP_TOP3', 80, NULL, '作品TOP3'),
  ('WORKSHOP_INSTRUCTOR', 400, NULL, '担任讲师'),
  ('WORKSHOP_FEEDBACK', 10, NULL, '课程反馈问卷'),
  ('WORKSHOP_FEEDBACK_QUALITY', 30, NULL, '优质迭代意见'),
  
  -- 录播课（飞书跳转模式）
  ('LESSON_MARK_COMPLETE', 50, NULL, '手动标记课时完成'),
  ('COURSE_REVIEW', 50, NULL, '发表课程感想（每课程一次）'),
  ('COURSE_QUESTION', 15, 10, '课程提问（>20字）'),
  ('COURSE_ANSWER', 30, NULL, '回答问题'),
  ('COURSE_FEATURED', 80, NULL, '精选回复'),
  ('COURSE_NOTE', 80, NULL, '上传学习笔记'),
  ('COURSE_MARATHON', 100, 1, '马拉松（一天标记完成3节）'),
  ('COURSE_50_PERCENT', 100, NULL, '里程碑：50%课程完成'),
  ('COURSE_100_PERCENT', 300, NULL, '里程碑：100%课程完成'),
  
  -- AI 体验台
  ('TOOL_EXPERIENCE', 30, NULL, '灵感碎片'),
  ('TOOL_RATING', 5, 10, '工具评分'),
  ('TOOL_CASE', 120, NULL, '应用案例'),
  ('TOOL_COMPARISON', 100, NULL, '工具对比'),
  ('TOOL_REVIEW', 150, NULL, '深度评测'),
  
  -- 社区互动
  ('ARTICLE_READ', 5, 5, '日报阅读（>2分钟）'),
  ('ARTICLE_READ_MONTHLY', 10, 5, '月报阅读（>2分钟）'),
  ('DISCUSSION_POST', 50, NULL, '分享优质内容（>20字）'),
  ('DISCUSSION_LEAD', 100, NULL, '引领话题（参与>10人）'),
  ('COMMENT', 5, 20, '评论互动（>20字）')
ON CONFLICT (action_type) DO NOTHING;

-- ==================== 用户积分余额表 ====================
-- 汇总表，存储用户当前积分状态
CREATE TABLE IF NOT EXISTS public.user_point_balance (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,  -- 累计获得积分
  available_points INTEGER NOT NULL DEFAULT 0,  -- 可用积分（扣除已消费）
  spent_points INTEGER NOT NULL DEFAULT 0,  -- 已消费积分
  level INTEGER NOT NULL DEFAULT 1,  -- 用户等级
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 确保积分不为负
  CONSTRAINT positive_total_points CHECK (total_points >= 0),
  CONSTRAINT positive_available_points CHECK (available_points >= 0),
  CONSTRAINT positive_spent_points CHECK (spent_points >= 0)
);

-- ==================== 积分流水记录表 ====================
-- 记录所有积分变动，用于审计和防刷
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,  -- 正数为获得，负数为消费
  action_type TEXT NOT NULL,  -- 行为类型
  reference_id UUID,  -- 关联对象 ID（课时、Workshop 等）
  reference_type TEXT,  -- 关联对象类型
  description TEXT,  -- 描述
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 索引
  CONSTRAINT valid_points CHECK (points != 0)
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action_type ON public.point_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_date ON public.point_transactions(user_id, created_at);

-- ==================== 用户连续登录记录表 ====================
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,  -- 当前连续天数
  longest_streak INTEGER NOT NULL DEFAULT 0,  -- 最长连续天数
  last_login_date DATE,  -- 最后登录日期
  streak_start_date DATE,  -- 当前连续开始日期
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 勋章定义表 ====================
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,  -- 勋章代码
  name TEXT NOT NULL,  -- 勋章名称
  description TEXT,  -- 勋章描述
  icon_url TEXT,  -- 图标 URL
  category TEXT NOT NULL,  -- 分类：learning, workshop, community, achievement
  tier INTEGER DEFAULT 1,  -- 等级：1-铜，2-银，3-金
  points_reward INTEGER DEFAULT 0,  -- 解锁奖励积分
  requirement_type TEXT,  -- 解锁条件类型
  requirement_value INTEGER,  -- 解锁条件值
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认勋章
INSERT INTO public.badges (code, name, description, category, tier, points_reward, requirement_type, requirement_value, order_index) VALUES
  -- 学习勋章
  ('FIRST_LESSON', '初学者', '完成第一节课', 'learning', 1, 10, 'lessons_completed', 1, 1),
  ('LESSON_10', '学习达人', '完成10节课', 'learning', 2, 50, 'lessons_completed', 10, 2),
  ('LESSON_50', '学霸', '完成50节课', 'learning', 3, 150, 'lessons_completed', 50, 3),
  ('COURSE_COMPLETE', '毕业生', '完成一门完整课程', 'learning', 2, 100, 'courses_completed', 1, 4),
  ('ALL_COURSES', '全科状元', '完成所有课程', 'learning', 3, 500, 'all_courses', 1, 5),
  
  -- Workshop 勋章
  ('FIRST_CHECKIN', '首次签到', '第一次参与 Workshop', 'workshop', 1, 10, 'checkins', 1, 10),
  ('CHECKIN_5', '活跃参与者', '参与5次 Workshop', 'workshop', 2, 50, 'checkins', 5, 11),
  ('CHECKIN_ALL', '全勤学员', '参与所有 Workshop', 'workshop', 3, 200, 'all_workshops', 1, 12),
  ('FIRST_SUBMISSION', '创作新星', '提交第一个作品', 'workshop', 1, 30, 'submissions', 1, 13),
  ('SUBMISSION_TOP3', 'TOP3 作品', '作品获得 TOP3', 'workshop', 3, 100, 'top3', 1, 14),
  ('INSTRUCTOR', '讲师', '担任一次讲师', 'workshop', 3, 200, 'instructor', 1, 15),
  
  -- 社区勋章
  ('FIRST_COMMENT', '话痨入门', '发表第一条评论', 'community', 1, 5, 'comments', 1, 20),
  ('HELPFUL', '乐于助人', '回答10个问题', 'community', 2, 50, 'answers', 10, 21),
  ('EXPERT', '问答专家', '获得5个精选回复', 'community', 3, 150, 'featured_answers', 5, 22),
  ('NOTE_TAKER', '笔记达人', '上传10篇笔记', 'community', 2, 100, 'notes', 10, 23),
  
  -- 成就勋章
  ('STREAK_7', '周坚持', '连续登录7天', 'achievement', 1, 50, 'streak', 7, 30),
  ('STREAK_30', '月坚持', '连续登录30天', 'achievement', 2, 200, 'streak', 30, 31),
  ('STREAK_100', '百日坚持', '连续登录100天', 'achievement', 3, 500, 'streak', 100, 32),
  ('POINTS_500', '积分新手', '累计获得500积分', 'achievement', 1, 0, 'total_points', 500, 33),
  ('POINTS_2000', '积分达人', '累计获得2000积分', 'achievement', 2, 0, 'total_points', 2000, 34),
  ('POINTS_5000', '积分王者', '累计获得5000积分', 'achievement', 3, 0, 'total_points', 5000, 35),
  
  -- AI 体验勋章
  ('TOOL_EXPLORER', '工具新手', '体验10款AI工具', 'learning', 1, 30, 'tools_experienced', 10, 40),
  ('TOOL_HUNTER', '工具猎人', '体验30款AI工具', 'learning', 2, 150, 'tools_experienced', 30, 41),
  ('CASE_WRITER', '案例作者', '发布5个应用案例', 'learning', 2, 100, 'cases', 5, 42)
ON CONFLICT (code) DO NOTHING;

-- ==================== 用户勋章关联表 ====================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);

-- ==================== 成就定义表 ====================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL,
  max_progress INTEGER NOT NULL DEFAULT 1,  -- 达成所需进度
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认成就
INSERT INTO public.achievements (code, name, description, category, max_progress, points_reward, order_index) VALUES
  ('OBSERVER', '观察员', '完成基础学习任务', 'level', 100, 0, 1),
  ('PRACTITIONER', '实践家', '积极参与各项活动', 'level', 500, 0, 2),
  ('NAVIGATOR', 'AI 领航员', '全面掌握 AI 技能', 'level', 2000, 0, 3),
  ('MARATHON_LEARNER', '马拉松学习者', '一天内完成3节课', 'special', 3, 100, 10),
  ('PERFECT_WEEK', '完美一周', '一周内每天都登录', 'special', 7, 50, 11),
  ('COMMUNITY_STAR', '社区之星', '获得50个点赞', 'special', 50, 100, 12)
ON CONFLICT (code) DO NOTHING;

-- ==================== 用户成就进度表 ====================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

-- ==================== 积分原子操作函数 ====================
-- 保证积分操作的并发安全性
CREATE OR REPLACE FUNCTION public.add_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_daily_total INTEGER;
  v_daily_limit INTEGER;
  v_new_balance INTEGER;
  v_actual_points INTEGER;
BEGIN
  -- 如果积分为0或负数（消费），直接处理
  IF p_points <= 0 THEN
    v_actual_points := p_points;
  ELSE
    -- 获取该行为的每日上限
    SELECT daily_limit INTO v_daily_limit
    FROM point_rules
    WHERE action_type = p_action_type AND is_active = TRUE;
    
    -- 检查每日积分上限（总体上限300分）
    SELECT COALESCE(SUM(points), 0) INTO v_daily_total
    FROM point_transactions
    WHERE user_id = p_user_id 
      AND points > 0
      AND created_at >= CURRENT_DATE;
    
    -- 应用总体每日上限
    IF v_daily_total >= 300 THEN
      RETURN 0;  -- 已达每日上限
    END IF;
    
    v_actual_points := LEAST(p_points, 300 - v_daily_total);
    
    -- 如果有行为特定的每日上限，检查该行为今日次数
    IF v_daily_limit IS NOT NULL THEN
      DECLARE
        v_action_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_action_count
        FROM point_transactions
        WHERE user_id = p_user_id 
          AND action_type = p_action_type
          AND created_at >= CURRENT_DATE;
        
        IF v_action_count >= v_daily_limit THEN
          RETURN 0;  -- 该行为已达每日上限
        END IF;
      END;
    END IF;
  END IF;
  
  IF v_actual_points = 0 THEN
    RETURN 0;
  END IF;
  
  -- 插入流水记录
  INSERT INTO point_transactions (user_id, points, action_type, reference_id, reference_type, description)
  VALUES (p_user_id, v_actual_points, p_action_type, p_reference_id, p_reference_type, p_description);
  
  -- 原子更新余额（使用 UPSERT）
  INSERT INTO user_point_balance (user_id, total_points, available_points, updated_at)
  VALUES (
    p_user_id, 
    GREATEST(0, v_actual_points), 
    GREATEST(0, v_actual_points), 
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_points = CASE 
      WHEN v_actual_points > 0 THEN user_point_balance.total_points + v_actual_points
      ELSE user_point_balance.total_points
    END,
    available_points = user_point_balance.available_points + v_actual_points,
    spent_points = CASE 
      WHEN v_actual_points < 0 THEN user_point_balance.spent_points + ABS(v_actual_points)
      ELSE user_point_balance.spent_points
    END,
    updated_at = NOW()
  RETURNING available_points INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- ==================== 连续登录更新函数 ====================
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  points_earned INTEGER,
  badge_unlocked TEXT
) AS $$
DECLARE
  v_last_login DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_points_earned INTEGER := 0;
  v_badge_unlocked TEXT := NULL;
BEGIN
  -- 获取或创建用户 streak 记录
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_login_date, streak_start_date)
  VALUES (p_user_id, 0, 0, NULL, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT us.last_login_date, us.current_streak, us.longest_streak
  INTO v_last_login, v_current_streak, v_longest_streak
  FROM user_streaks us
  WHERE us.user_id = p_user_id;
  
  -- 如果今天已经登录过，不重复计算
  IF v_last_login = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, 0, NULL::TEXT;
    RETURN;
  END IF;
  
  -- 计算连续登录
  IF v_last_login IS NULL OR v_last_login < v_today - 1 THEN
    -- 断签或首次登录，重新开始
    v_current_streak := 1;
    
    UPDATE user_streaks
    SET current_streak = 1,
        last_login_date = v_today,
        streak_start_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- 连续登录
    v_current_streak := v_current_streak + 1;
    
    -- 更新最长记录
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    
    UPDATE user_streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_login_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- 发放每日登录积分
  v_points_earned := public.add_user_points(p_user_id, 5, 'DAILY_LOGIN', NULL, NULL, '每日登录奖励');
  
  -- 检查里程碑奖励
  IF v_current_streak = 7 THEN
    v_points_earned := v_points_earned + public.add_user_points(p_user_id, 50, 'WEEKLY_STREAK', NULL, NULL, '连续登录7天奖励');
    v_badge_unlocked := 'STREAK_7';
  ELSIF v_current_streak = 30 THEN
    v_points_earned := v_points_earned + public.add_user_points(p_user_id, 200, 'MONTHLY_STREAK', NULL, NULL, '连续登录30天奖励');
    v_badge_unlocked := 'STREAK_30';
  ELSIF v_current_streak = 100 THEN
    v_points_earned := v_points_earned + public.add_user_points(p_user_id, 500, 'STREAK_100', NULL, NULL, '连续登录100天奖励');
    v_badge_unlocked := 'STREAK_100';
  END IF;
  
  -- 解锁勋章（如果有）
  IF v_badge_unlocked IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id)
    SELECT p_user_id, b.id
    FROM badges b
    WHERE b.code = v_badge_unlocked
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_points_earned, v_badge_unlocked;
END;
$$ LANGUAGE plpgsql;

-- ==================== 排行榜视图 ====================
-- 创建积分排行榜物化视图（定期刷新以提高性能）
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard_view AS
SELECT 
  u.id,
  u.name,
  u.avatar_url,
  COALESCE(upb.total_points, 0) as total_points,
  COALESCE(upb.level, 1) as level,
  COALESCE(us.current_streak, 0) as current_streak,
  (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) as badge_count,
  ROW_NUMBER() OVER (ORDER BY COALESCE(upb.total_points, 0) DESC) as rank
FROM users u
LEFT JOIN user_point_balance upb ON u.id = upb.user_id
LEFT JOIN user_streaks us ON u.id = us.user_id
WHERE u.role != 'admin'  -- 排除管理员
ORDER BY total_points DESC;

-- 创建唯一索引以支持并发刷新
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_view_id ON public.leaderboard_view(id);

-- 创建刷新排行榜的函数
CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard_view;
END;
$$ LANGUAGE plpgsql;

-- ==================== RLS 策略 ====================

-- point_rules 表：所有人可读，管理员可写
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read point rules" ON public.point_rules;
CREATE POLICY "Anyone can read point rules" ON public.point_rules
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage point rules" ON public.point_rules;
CREATE POLICY "Admins can manage point rules" ON public.point_rules
  FOR ALL USING (public.is_admin());

-- user_point_balance 表
ALTER TABLE public.user_point_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_point_balance;
CREATE POLICY "Users can view their own balance" ON public.user_point_balance
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all balances for leaderboard" ON public.user_point_balance;
CREATE POLICY "Users can view all balances for leaderboard" ON public.user_point_balance
  FOR SELECT USING (TRUE);  -- 排行榜需要查看所有用户积分

-- point_transactions 表
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.point_transactions;
CREATE POLICY "Users can view their own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.point_transactions;
CREATE POLICY "Admins can view all transactions" ON public.point_transactions
  FOR SELECT USING (public.is_admin());

-- user_streaks 表
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own streak" ON public.user_streaks;
CREATE POLICY "Users can view their own streak" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all streaks for leaderboard" ON public.user_streaks;
CREATE POLICY "Users can view all streaks for leaderboard" ON public.user_streaks
  FOR SELECT USING (TRUE);

-- badges 表
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;
CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;
CREATE POLICY "Admins can manage badges" ON public.badges
  FOR ALL USING (public.is_admin());

-- user_badges 表
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
CREATE POLICY "Users can view their own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all badges for profile" ON public.user_badges;
CREATE POLICY "Users can view all badges for profile" ON public.user_badges
  FOR SELECT USING (TRUE);  -- 查看他人主页时需要

-- achievements 表
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL USING (public.is_admin());

-- user_achievements 表
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- ==================== 授予函数执行权限 ====================
GRANT EXECUTE ON FUNCTION public.add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard() TO authenticated;

-- ==================== 添加注释 ====================
COMMENT ON TABLE public.point_rules IS '积分规则配置表';
COMMENT ON TABLE public.user_point_balance IS '用户积分余额汇总表';
COMMENT ON TABLE public.point_transactions IS '积分流水记录表';
COMMENT ON TABLE public.user_streaks IS '用户连续登录记录表';
COMMENT ON TABLE public.badges IS '勋章定义表';
COMMENT ON TABLE public.user_badges IS '用户已获得的勋章';
COMMENT ON TABLE public.achievements IS '成就定义表';
COMMENT ON TABLE public.user_achievements IS '用户成就进度表';
COMMENT ON FUNCTION public.add_user_points IS '原子性添加用户积分，自动处理每日上限';
COMMENT ON FUNCTION public.update_user_streak IS '更新用户连续登录记录并发放相应奖励';
COMMENT ON MATERIALIZED VIEW public.leaderboard_view IS '积分排行榜物化视图';
