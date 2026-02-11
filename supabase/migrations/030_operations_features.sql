-- =============================================
-- Migration 030: Operations Features
-- Phase 1 of Operations Plan - New tables, columns, rules, badges, and RPC functions
-- =============================================

-- =============================================
-- 1. New Tables
-- =============================================

-- Articles (日报/月报)
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  summary VARCHAR(500),
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'monthly')),
  cover_image TEXT,
  reading_time_estimate INT DEFAULT 5,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article reads tracking
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_article_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES miracle_learning_20260209_articles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent INT DEFAULT 0,
  scroll_depth FLOAT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  points_awarded BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, article_id)
);

-- Course easter eggs (知识彩蛋)
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_course_easter_eggs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES miracle_learning_20260209_lessons(id) ON DELETE CASCADE NOT NULL,
  egg_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN ('scroll_position', 'keyword', 'time', 'click')),
  trigger_value JSONB DEFAULT '{}',
  reward_points INT DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User easter egg discoveries
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_user_easter_egg_finds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  easter_egg_id UUID REFERENCES miracle_learning_20260209_course_easter_eggs(id) ON DELETE CASCADE NOT NULL,
  found_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, easter_egg_id)
);

-- Study groups (学习小组)
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  max_members INT DEFAULT 20,
  is_active BOOLEAN DEFAULT TRUE,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study group members
CREATE TABLE IF NOT EXISTS miracle_learning_20260209_study_group_members (
  group_id UUID REFERENCES miracle_learning_20260209_study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- =============================================
-- 2. Column Additions
-- =============================================

-- Add video_url to lessons
DO $$ BEGIN
  ALTER TABLE miracle_learning_20260209_lessons ADD COLUMN video_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add is_featured to qa_answers (if not exists)
DO $$ BEGIN
  ALTER TABLE miracle_learning_20260209_qa_answers ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- =============================================
-- 3. Enable RLS on all new tables
-- =============================================

ALTER TABLE miracle_learning_20260209_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_learning_20260209_article_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_learning_20260209_course_easter_eggs ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_learning_20260209_user_easter_egg_finds ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_learning_20260209_study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_learning_20260209_study_group_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS Policies
-- =============================================

-- Articles: published articles visible to all, admin can manage
DROP POLICY IF EXISTS "[ML] articles_select" ON miracle_learning_20260209_articles;
CREATE POLICY "[ML] articles_select" ON miracle_learning_20260209_articles FOR SELECT
  USING (is_published = TRUE OR public.ml_is_admin());

DROP POLICY IF EXISTS "[ML] articles_insert" ON miracle_learning_20260209_articles;
CREATE POLICY "[ML] articles_insert" ON miracle_learning_20260209_articles FOR INSERT
  WITH CHECK (public.ml_is_admin());

DROP POLICY IF EXISTS "[ML] articles_update" ON miracle_learning_20260209_articles;
CREATE POLICY "[ML] articles_update" ON miracle_learning_20260209_articles FOR UPDATE
  USING (public.ml_is_admin());

DROP POLICY IF EXISTS "[ML] articles_delete" ON miracle_learning_20260209_articles;
CREATE POLICY "[ML] articles_delete" ON miracle_learning_20260209_articles FOR DELETE
  USING (public.ml_is_admin());

-- Article reads: users can only manage their own reads
DROP POLICY IF EXISTS "[ML] article_reads_select" ON miracle_learning_20260209_article_reads;
CREATE POLICY "[ML] article_reads_select" ON miracle_learning_20260209_article_reads FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "[ML] article_reads_insert" ON miracle_learning_20260209_article_reads;
CREATE POLICY "[ML] article_reads_insert" ON miracle_learning_20260209_article_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "[ML] article_reads_update" ON miracle_learning_20260209_article_reads;
CREATE POLICY "[ML] article_reads_update" ON miracle_learning_20260209_article_reads FOR UPDATE
  USING (user_id = auth.uid());

-- Easter eggs: everyone can read, admin can manage
DROP POLICY IF EXISTS "[ML] easter_eggs_select" ON miracle_learning_20260209_course_easter_eggs;
CREATE POLICY "[ML] easter_eggs_select" ON miracle_learning_20260209_course_easter_eggs FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "[ML] easter_eggs_manage" ON miracle_learning_20260209_course_easter_eggs;
CREATE POLICY "[ML] easter_eggs_manage" ON miracle_learning_20260209_course_easter_eggs FOR ALL
  USING (public.ml_is_admin());

-- User easter egg finds: users can manage their own
DROP POLICY IF EXISTS "[ML] egg_finds_select" ON miracle_learning_20260209_user_easter_egg_finds;
CREATE POLICY "[ML] egg_finds_select" ON miracle_learning_20260209_user_easter_egg_finds FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "[ML] egg_finds_insert" ON miracle_learning_20260209_user_easter_egg_finds;
CREATE POLICY "[ML] egg_finds_insert" ON miracle_learning_20260209_user_easter_egg_finds FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Study groups: everyone can read, creator/admin can manage
DROP POLICY IF EXISTS "[ML] study_groups_select" ON miracle_learning_20260209_study_groups;
CREATE POLICY "[ML] study_groups_select" ON miracle_learning_20260209_study_groups FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "[ML] study_groups_insert" ON miracle_learning_20260209_study_groups;
CREATE POLICY "[ML] study_groups_insert" ON miracle_learning_20260209_study_groups FOR INSERT
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "[ML] study_groups_update" ON miracle_learning_20260209_study_groups;
CREATE POLICY "[ML] study_groups_update" ON miracle_learning_20260209_study_groups FOR UPDATE
  USING (creator_id = auth.uid() OR public.ml_is_admin());

DROP POLICY IF EXISTS "[ML] study_groups_delete" ON miracle_learning_20260209_study_groups;
CREATE POLICY "[ML] study_groups_delete" ON miracle_learning_20260209_study_groups FOR DELETE
  USING (creator_id = auth.uid() OR public.ml_is_admin());

-- Study group members: everyone can read, users manage their own membership
DROP POLICY IF EXISTS "[ML] group_members_select" ON miracle_learning_20260209_study_group_members;
CREATE POLICY "[ML] group_members_select" ON miracle_learning_20260209_study_group_members FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "[ML] group_members_insert" ON miracle_learning_20260209_study_group_members;
CREATE POLICY "[ML] group_members_insert" ON miracle_learning_20260209_study_group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "[ML] group_members_delete" ON miracle_learning_20260209_study_group_members;
CREATE POLICY "[ML] group_members_delete" ON miracle_learning_20260209_study_group_members FOR DELETE
  USING (user_id = auth.uid() OR public.ml_is_admin());

-- =============================================
-- 5. Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS ml_idx_articles_type_published ON miracle_learning_20260209_articles(type, is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_articles_author ON miracle_learning_20260209_articles(author_id);
CREATE INDEX IF NOT EXISTS ml_idx_article_reads_user ON miracle_learning_20260209_article_reads(user_id, article_id);
CREATE INDEX IF NOT EXISTS ml_idx_article_reads_article ON miracle_learning_20260209_article_reads(article_id);
CREATE INDEX IF NOT EXISTS ml_idx_easter_eggs_lesson ON miracle_learning_20260209_course_easter_eggs(lesson_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS ml_idx_egg_finds_user ON miracle_learning_20260209_user_easter_egg_finds(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_study_groups_creator ON miracle_learning_20260209_study_groups(creator_id);
CREATE INDEX IF NOT EXISTS ml_idx_study_groups_active ON miracle_learning_20260209_study_groups(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_group_members_user ON miracle_learning_20260209_study_group_members(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_qa_answers_featured ON miracle_learning_20260209_qa_answers(question_id) WHERE is_featured = TRUE;

-- =============================================
-- 6. Insert new point rules (idempotent)
-- =============================================

INSERT INTO miracle_learning_20260209_point_rules (action_type, points, daily_limit, is_active) VALUES
  ('WORKSHOP_INTERACTION', 10, 5, TRUE),
  ('COURSE_REFLECTION', 50, 1, TRUE),
  ('QUIZ_PERFECT', 20, 5, TRUE),
  ('EASTER_EGG_FOUND', 30, 3, TRUE),
  ('NOTE_UPLOAD', 80, 3, TRUE),
  ('FEATURED_REPLY', 80, 3, TRUE),
  ('QUALITY_COMMENT', 20, 5, TRUE),
  ('TOOL_SHARE', 80, 3, TRUE),
  ('TOPIC_LEADER', 100, 3, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  points = EXCLUDED.points,
  daily_limit = EXCLUDED.daily_limit,
  is_active = TRUE;

-- Update TOOL_CASE to match operations plan (100 instead of 120)
UPDATE miracle_learning_20260209_point_rules SET points = 100 WHERE action_type = 'TOOL_CASE';

-- =============================================
-- 7. Insert new badges (idempotent)
-- =============================================

INSERT INTO miracle_learning_20260209_badges (code, name, description, category, tier, points_reward, requirement_type, requirement_value) VALUES
  ('QUESTIONER', '提问达人', '累计提问20次', 'community', 2, 50, 'qa_questions', 20),
  ('HELPFUL_EXPERT', '热心助人', '回答被采纳10次', 'community', 2, 100, 'accepted_answers', 10),
  ('NOTE_MASTER', '笔记达人', '上传10篇学习笔记', 'learning', 2, 100, 'notes_uploaded', 10),
  ('SOCIAL_STAR', '社交达人', '获赞总数超过100', 'community', 2, 80, 'total_likes_received', 100)
ON CONFLICT (code) DO UPDATE SET
  points_reward = EXCLUDED.points_reward,
  requirement_value = EXCLUDED.requirement_value;

-- Update existing badges to match operations plan values
UPDATE miracle_learning_20260209_badges SET points_reward = 150 WHERE code = 'TOOL_HUNTER';
UPDATE miracle_learning_20260209_badges SET points_reward = 200 WHERE code = 'CHECKIN_ALL';

-- =============================================
-- 8. RPC Functions
-- =============================================

-- Get workshop progress for current quarter
CREATE OR REPLACE FUNCTION ml_get_workshop_progress(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_checkin_count INT;
  v_total_workshops INT;
  v_quarter_start DATE;
BEGIN
  -- Calculate current quarter start
  v_quarter_start := date_trunc('quarter', CURRENT_DATE)::date;

  -- Count user checkins this quarter
  SELECT COUNT(*) INTO v_checkin_count
  FROM miracle_learning_20260209_workshop_checkins wc
  JOIN miracle_learning_20260209_workshops w ON w.id = wc.workshop_id
  WHERE wc.user_id = p_user_id
    AND w.event_date >= v_quarter_start;

  -- Count total workshops this quarter
  SELECT COUNT(*) INTO v_total_workshops
  FROM miracle_learning_20260209_workshops
  WHERE event_date >= v_quarter_start
    AND is_active = TRUE;

  -- Default to 6 if no workshops exist
  IF v_total_workshops = 0 THEN
    v_total_workshops := 6;
  END IF;

  RETURN json_build_object(
    'checkin_count', v_checkin_count,
    'total_workshops', v_total_workshops,
    'quarter_start', v_quarter_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get course completion count
CREATE OR REPLACE FUNCTION ml_get_course_completion_count(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_completed INT;
  v_total INT;
BEGIN
  -- Count total published courses
  SELECT COUNT(*) INTO v_total
  FROM miracle_learning_20260209_courses WHERE is_published = TRUE;

  -- Count courses where all lessons are completed
  SELECT COUNT(DISTINCT c.id) INTO v_completed
  FROM miracle_learning_20260209_courses c
  WHERE c.is_published = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM miracle_learning_20260209_chapters ch
      JOIN miracle_learning_20260209_lessons l ON l.chapter_id = ch.id
      WHERE ch.course_id = c.id
        AND NOT EXISTS (
          SELECT 1 FROM miracle_learning_20260209_user_lesson_progress ulp
          WHERE ulp.lesson_id = l.id
            AND ulp.user_id = p_user_id
            AND ulp.is_completed = TRUE
        )
    )
    AND EXISTS (
      SELECT 1 FROM miracle_learning_20260209_chapters ch2
      JOIN miracle_learning_20260209_lessons l2 ON l2.chapter_id = ch2.id
      WHERE ch2.course_id = c.id
    );

  RETURN json_build_object(
    'completed', v_completed,
    'total', GREATEST(v_total, 6)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get user portfolio stats
CREATE OR REPLACE FUNCTION ml_get_user_portfolio_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_submissions INT;
  v_experiences INT;
  v_cases INT;
  v_notes INT;
  v_total_likes INT;
BEGIN
  SELECT COUNT(*) INTO v_submissions
  FROM miracle_learning_20260209_workshop_submissions WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_experiences
  FROM miracle_learning_20260209_tool_experiences WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_cases
  FROM miracle_learning_20260209_tool_cases WHERE user_id = p_user_id AND status = 'approved';

  SELECT COUNT(*) INTO v_notes
  FROM miracle_learning_20260209_course_notes WHERE user_id = p_user_id AND is_public = TRUE;

  -- Count total likes received across all user content
  SELECT COALESCE(SUM(cnt), 0) INTO v_total_likes FROM (
    SELECT COUNT(*) as cnt FROM miracle_learning_20260209_likes WHERE target_type = 'submission'
      AND target_id::uuid IN (SELECT id FROM miracle_learning_20260209_workshop_submissions WHERE user_id = p_user_id)
    UNION ALL
    SELECT COUNT(*) as cnt FROM miracle_learning_20260209_likes WHERE target_type = 'note'
      AND target_id::uuid IN (SELECT id FROM miracle_learning_20260209_course_notes WHERE user_id = p_user_id)
  ) t;

  RETURN json_build_object(
    'submissions', v_submissions,
    'experiences', v_experiences,
    'cases', v_cases,
    'notes', v_notes,
    'total_likes', v_total_likes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get weekly top gainers for homepage
CREATE OR REPLACE FUNCTION ml_get_weekly_top_gainers()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(t) FROM (
      SELECT
        pt.user_id,
        u.name,
        u.avatar_url,
        SUM(pt.points) as weekly_points
      FROM miracle_learning_20260209_point_transactions pt
      JOIN miracle_learning_20260209_users u ON u.id = pt.user_id
      WHERE pt.created_at >= date_trunc('week', NOW())
        AND pt.points > 0
        AND u.role != 'admin'
      GROUP BY pt.user_id, u.name, u.avatar_url
      ORDER BY weekly_points DESC
      LIMIT 3
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at on articles
CREATE OR REPLACE TRIGGER ml_update_articles_updated_at
  BEFORE UPDATE ON miracle_learning_20260209_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on study_groups
CREATE OR REPLACE TRIGGER ml_update_study_groups_updated_at
  BEFORE UPDATE ON miracle_learning_20260209_study_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update study group member count
CREATE OR REPLACE FUNCTION ml_update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE miracle_learning_20260209_study_groups SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE miracle_learning_20260209_study_groups SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER ml_update_group_member_count_trigger
  AFTER INSERT OR DELETE ON miracle_learning_20260209_study_group_members
  FOR EACH ROW
  EXECUTE FUNCTION ml_update_group_member_count();
