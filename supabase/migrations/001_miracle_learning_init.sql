-- =============================================================
-- Miracle Learning - Consolidated Database Migration
-- All objects use prefixed names to avoid conflicts in shared DB.
--
-- Table prefix:     miracle_learning_20260209_
-- Function prefix:  ml_
-- Trigger prefix:   ml_
-- Index prefix:     ml_idx_
-- Policy prefix:    [ML]
-- View prefix:      ml_
-- Sequence prefix:  ml_
--
-- CRITICAL SAFETY RULES:
-- 1. NEVER DROP triggers on auth.users that belong to other projects
-- 2. NEVER INSERT INTO our tables FROM auth.users (no bulk sync)
-- 3. All objects are created with IF NOT EXISTS / OR REPLACE
-- 4. Only our own prefixed objects are modified
--
-- Generated: 2026-02-09
-- =============================================================

-- Enable UUID extension (database-level, safe with IF NOT EXISTS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- SECTION 1: CORE TABLES
-- =============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workshops table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  event_date DATE NOT NULL,
  feishu_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workshop checkins table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_workshop_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_workshops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, workshop_id)
);

-- Courses table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  feishu_url TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'boolean')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User answers table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- User lesson progress table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  marked_complete_at TIMESTAMPTZ,
  last_position INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- =============================================================
-- SECTION 2: GAMIFICATION TABLES
-- =============================================================

-- Point rules configuration table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_point_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default point rules
INSERT INTO public.miracle_learning_20260209_point_rules (action_type, points, daily_limit, description) VALUES
  ('PROFILE_COMPLETE', 20, 1, '完善个人资料（首次）'),
  ('DAILY_LOGIN', 5, 1, '每日登录'),
  ('WEEKLY_STREAK', 50, NULL, '连续7天登录'),
  ('MONTHLY_STREAK', 200, NULL, '连续30天登录'),
  ('INVITE_USER', 80, NULL, '邀请新人注册并完成首次学习'),
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
  ('LESSON_MARK_COMPLETE', 50, NULL, '手动标记课时完成'),
  ('COURSE_REVIEW', 50, NULL, '发表课程感想（每课程一次）'),
  ('COURSE_QUESTION', 15, 10, '课程提问（>20字）'),
  ('COURSE_ANSWER', 30, NULL, '回答问题'),
  ('COURSE_FEATURED', 80, NULL, '精选回复'),
  ('COURSE_NOTE', 80, NULL, '上传学习笔记'),
  ('COURSE_MARATHON', 100, 1, '马拉松（一天标记完成3节）'),
  ('COURSE_50_PERCENT', 100, NULL, '里程碑：50%课程完成'),
  ('COURSE_100_PERCENT', 300, NULL, '里程碑：100%课程完成'),
  ('TOOL_EXPERIENCE', 30, NULL, '灵感碎片'),
  ('TOOL_RATING', 5, 10, '工具评分'),
  ('TOOL_CASE', 100, NULL, '应用案例'),
  ('TOOL_COMPARISON', 100, NULL, '工具对比'),
  ('TOOL_REVIEW', 150, NULL, '深度评测'),
  ('ARTICLE_READ', 5, 5, '日报阅读（>2分钟）'),
  ('ARTICLE_READ_MONTHLY', 10, 5, '月报阅读（>2分钟）'),
  ('DISCUSSION_POST', 50, NULL, '分享优质内容（>20字）'),
  ('DISCUSSION_LEAD', 100, NULL, '引领话题（参与>10人）'),
  ('COMMENT', 5, 20, '评论互动（>20字）'),
  ('BADGE_REWARD', 0, NULL, '勋章解锁奖励（积分由勋章定义）'),
  ('SPEND', 0, NULL, '积分消费'),
  ('CREATE_DISCUSSION', 20, 5, '创建讨论话题'),
  ('INVITE_COMPLETE', 80, NULL, '邀请用户完成注册'),
  ('POPULAR_DISCUSSION', 50, NULL, '讨论成为热门'),
  ('WORKSHOP_INTERACTION', 10, 5, '现场互动'),
  ('COURSE_REFLECTION', 50, 1, '课程反思'),
  ('QUIZ_PERFECT', 20, 5, '测试满分'),
  ('EASTER_EGG_FOUND', 30, 3, '发现知识彩蛋'),
  ('NOTE_UPLOAD', 80, 3, '上传笔记'),
  ('FEATURED_REPLY', 80, 3, '精选回复'),
  ('QUALITY_COMMENT', 20, 5, '优质评论'),
  ('TOOL_SHARE', 80, 3, '工具分享'),
  ('TOPIC_LEADER', 100, 3, '话题领袖')
ON CONFLICT (action_type) DO NOTHING;

-- User point balance table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_point_balance (
  user_id UUID PRIMARY KEY REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  available_points INTEGER NOT NULL DEFAULT 0,
  spent_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ml_positive_total_points CHECK (total_points >= 0),
  CONSTRAINT ml_positive_available_points CHECK (available_points >= 0),
  CONSTRAINT ml_positive_spent_points CHECK (spent_points >= 0)
);

-- Point transactions table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ml_valid_points CHECK (points != 0)
);

-- User streaks table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  streak_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges definition table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL,
  tier INTEGER DEFAULT 1,
  points_reward INTEGER DEFAULT 0,
  requirement_type TEXT,
  requirement_value INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default badges
INSERT INTO public.miracle_learning_20260209_badges (code, name, description, category, tier, points_reward, requirement_type, requirement_value, order_index) VALUES
  ('FIRST_LESSON', '初学者', '完成第一节课', 'learning', 1, 10, 'lessons_completed', 1, 1),
  ('LESSON_10', '学习达人', '完成10节课', 'learning', 2, 50, 'lessons_completed', 10, 2),
  ('LESSON_50', '学霸', '完成50节课', 'learning', 3, 150, 'lessons_completed', 50, 3),
  ('COURSE_COMPLETE', '毕业生', '完成一门完整课程', 'learning', 2, 100, 'courses_completed', 1, 4),
  ('ALL_COURSES', '全科状元', '完成所有课程', 'learning', 3, 500, 'all_courses', 1, 5),
  ('FIRST_CHECKIN', '首次签到', '第一次参与 Workshop', 'workshop', 1, 10, 'checkins', 1, 10),
  ('CHECKIN_5', '活跃参与者', '参与5次 Workshop', 'workshop', 2, 50, 'checkins', 5, 11),
  ('CHECKIN_ALL', '全勤学员', '参与所有 Workshop', 'workshop', 3, 200, 'all_workshops', 1, 12),
  ('FIRST_SUBMISSION', '创作新星', '提交第一个作品', 'workshop', 1, 30, 'submissions', 1, 13),
  ('SUBMISSION_TOP3', 'TOP3 作品', '作品获得 TOP3', 'workshop', 3, 100, 'top3', 1, 14),
  ('INSTRUCTOR', '讲师', '担任一次讲师', 'workshop', 3, 200, 'instructor', 1, 15),
  ('FIRST_COMMENT', '话痨入门', '发表第一条评论', 'community', 1, 5, 'comments', 1, 20),
  ('HELPFUL', '乐于助人', '回答10个问题', 'community', 2, 50, 'answers', 10, 21),
  ('EXPERT', '问答专家', '获得5个精选回复', 'community', 3, 150, 'featured_answers', 5, 22),
  ('NOTE_TAKER', '笔记达人', '上传10篇笔记', 'community', 2, 100, 'notes', 10, 23),
  ('STREAK_7', '周坚持', '连续登录7天', 'achievement', 1, 50, 'streak', 7, 30),
  ('STREAK_30', '月坚持', '连续登录30天', 'achievement', 2, 200, 'streak', 30, 31),
  ('STREAK_100', '百日坚持', '连续登录100天', 'achievement', 3, 500, 'streak', 100, 32),
  ('POINTS_500', '积分新手', '累计获得500积分', 'achievement', 1, 0, 'total_points', 500, 33),
  ('POINTS_2000', '积分达人', '累计获得2000积分', 'achievement', 2, 0, 'total_points', 2000, 34),
  ('POINTS_5000', '积分王者', '累计获得5000积分', 'achievement', 3, 0, 'total_points', 5000, 35),
  ('TOOL_EXPLORER', '工具新手', '体验10款AI工具', 'learning', 1, 30, 'tools_experienced', 10, 40),
  ('TOOL_HUNTER', '工具猎人', '体验30款AI工具', 'learning', 2, 150, 'tools_experienced', 30, 41),
  ('CASE_WRITER', '案例作者', '发布5个应用案例', 'learning', 2, 100, 'cases', 5, 42),
  ('QUESTIONER', '提问达人', '累计提问20次', 'community', 2, 50, 'qa_questions', 20, 43),
  ('HELPFUL_EXPERT', '热心助人', '回答被采纳10次', 'community', 2, 100, 'accepted_answers', 10, 44),
  ('NOTE_MASTER', '笔记达人', '上传10篇学习笔记', 'learning', 2, 100, 'notes_uploaded', 10, 45),
  ('SOCIAL_STAR', '社交达人', '获赞总数超过100', 'community', 2, 80, 'total_likes_received', 100, 46)
ON CONFLICT (code) DO NOTHING;

-- User badges table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Achievements definition table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL,
  max_progress INTEGER NOT NULL DEFAULT 1,
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO public.miracle_learning_20260209_achievements (code, name, description, category, max_progress, points_reward, order_index) VALUES
  ('OBSERVER', '观察员', '完成基础学习任务', 'level', 100, 0, 1),
  ('PRACTITIONER', '实践家', '积极参与各项活动', 'level', 500, 0, 2),
  ('NAVIGATOR', 'AI 领航员', '全面掌握 AI 技能', 'level', 2000, 0, 3),
  ('MARATHON_LEARNER', '马拉松学习者', '一天内完成3节课', 'special', 3, 100, 10),
  ('PERFECT_WEEK', '完美一周', '一周内每天都登录', 'special', 7, 50, 11),
  ('COMMUNITY_STAR', '社区之星', '获得50个点赞', 'special', 50, 100, 12)
ON CONFLICT (code) DO NOTHING;

-- User achievements progress table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_achievements(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- =============================================================
-- SECTION 3: WORKSHOP INTERACTION TABLES
-- =============================================================

-- Likes table (polymorphic)
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- Comments table (polymorphic, supports nesting)
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  parent_id UUID REFERENCES public.miracle_learning_20260209_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 5),
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workshop submissions table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_workshop_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'document', 'link', 'text')),
  content_url TEXT,
  content_text TEXT,
  description TEXT,
  tags TEXT[],
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES public.miracle_learning_20260209_workshop_submissions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instructor applications table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_instructor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  outline TEXT,
  duration INTEGER NOT NULL,
  target_audience TEXT,
  prerequisites TEXT,
  materials_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled')),
  rejection_reason TEXT,
  scheduled_date DATE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Workshop materials table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_workshop_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('document', 'video', 'link', 'quiz')),
  url TEXT,
  content TEXT,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User material progress table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_material_progress (
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_workshop_materials(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, material_id)
);

-- Workshop feedback table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_workshop_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_workshops(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content_quality INTEGER CHECK (content_quality >= 1 AND content_quality <= 5),
  instructor_quality INTEGER CHECK (instructor_quality >= 1 AND instructor_quality <= 5),
  suggestions TEXT,
  is_quality BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workshop_id)
);

-- =============================================================
-- SECTION 4: COURSE INTERACTION TABLES
-- =============================================================

-- Course reviews table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 50),
  is_featured BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Course notes table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_course_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.miracle_learning_20260209_lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  like_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note bookmarks table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_note_bookmarks (
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_course_notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, note_id)
);

-- QA questions table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.miracle_learning_20260209_lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 20),
  bounty_points INTEGER DEFAULT 0,
  is_resolved BOOLEAN DEFAULT FALSE,
  accepted_answer_id UUID,
  view_count INTEGER DEFAULT 0,
  answer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QA answers table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_qa_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 20),
  is_featured BOOLEAN DEFAULT FALSE,
  is_accepted BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for accepted_answer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ml_fk_qa_questions_accepted_answer'
  ) THEN
    ALTER TABLE public.miracle_learning_20260209_qa_questions
      ADD CONSTRAINT ml_fk_qa_questions_accepted_answer
      FOREIGN KEY (accepted_answer_id) REFERENCES public.miracle_learning_20260209_qa_answers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Course milestones table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_course_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_courses(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, course_id, milestone_type)
);

-- =============================================================
-- SECTION 5: AI TOOLS TABLES
-- =============================================================

-- Tool categories table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_tool_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI tools table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.miracle_learning_20260209_tool_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  logo_url TEXT,
  website_url TEXT,
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('free', 'freemium', 'paid')),
  pricing_details TEXT,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  experience_count INTEGER DEFAULT 0,
  case_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool ratings table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_tool_ratings (
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_ai_tools(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tool_id)
);

-- Tool experiences table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_tool_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_ai_tools(id) ON DELETE CASCADE,
  use_case TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  screenshot_url TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool cases table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_tool_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_ai_tools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_background TEXT NOT NULL,
  solution TEXT NOT NULL,
  result TEXT,
  images TEXT[],
  tags TEXT[],
  like_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tool comparisons table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_tool_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tool_ids UUID[] NOT NULL,
  comparison_content JSONB NOT NULL,
  conclusion TEXT,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User bookmarks table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_bookmarks (
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_id)
);

-- Weekly picks table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_weekly_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_ai_tools(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  reason TEXT,
  picked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tool_id, week_start)
);

-- Initialize tool categories
INSERT INTO public.miracle_learning_20260209_tool_categories (name, slug, description, icon, order_index) VALUES
  ('文本生成', 'text-generation', 'AI 写作、对话、文案生成工具', 'MessageSquare', 1),
  ('图像处理', 'image-processing', 'AI 绘画、图像编辑、设计工具', 'Image', 2),
  ('代码辅助', 'code-assistant', 'AI 编程、代码补全、调试工具', 'Code', 3),
  ('数据分析', 'data-analysis', 'AI 数据处理、可视化、分析工具', 'BarChart', 4),
  ('音视频', 'audio-video', 'AI 语音合成、视频编辑工具', 'Video', 5),
  ('效率工具', 'productivity', 'AI 日程管理、笔记、自动化工具', 'Zap', 6),
  ('其他', 'other', '其他 AI 工具', 'Sparkles', 99)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- SECTION 6: COMMUNITY TABLES
-- =============================================================

-- Discussions table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 20),
  tags TEXT[],
  participant_count INTEGER DEFAULT 1,
  comment_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion participants table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_discussion_participants (
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  discussion_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_discussions(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, discussion_id)
);

-- User invitations table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES public.miracle_learning_20260209_users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'completed')),
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Reward items table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_reward_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock INTEGER DEFAULT -1,
  max_per_user INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward orders table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_reward_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_reward_items(id),
  points_spent INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
  shipping_info JSONB,
  notes TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.miracle_learning_20260209_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ai_navigator', 'completion', 'achievement')),
  certificate_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(user_id, type)
);

-- Insert sample reward items
INSERT INTO public.miracle_learning_20260209_reward_items (name, description, image_url, category, points_cost, stock, max_per_user, is_featured, order_index) VALUES
  ('Miracle Learning 定制贴纸包', '精美贴纸包，包含10张定制贴纸', NULL, 'physical', 200, 100, 2, FALSE, 1),
  ('专属学习笔记本', 'A5精装笔记本，含Miracle Learning LOGO', NULL, 'physical', 500, 50, 1, TRUE, 2),
  ('线下活动优先席位', '获得下次线下活动的优先报名资格', NULL, 'privilege', 300, -1, 3, FALSE, 3),
  ('1对1学习咨询（15分钟）', '与导师进行15分钟的1对1学习咨询', NULL, 'service', 1000, 10, 1, TRUE, 4),
  ('VIP 学习群入群资格', '加入VIP学习交流群，与更多优秀学员交流', NULL, 'privilege', 800, -1, 1, FALSE, 5)
ON CONFLICT DO NOTHING;

-- =============================================================
-- SECTION 7: ARTICLES & STUDY GROUPS (from migration 030)
-- =============================================================

-- Articles table
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_articles (
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
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_article_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.miracle_learning_20260209_articles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent INT DEFAULT 0,
  scroll_depth FLOAT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  points_awarded BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, article_id)
);

-- Course easter eggs
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_course_easter_eggs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.miracle_learning_20260209_lessons(id) ON DELETE CASCADE NOT NULL,
  egg_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN ('scroll_position', 'keyword', 'time', 'click')),
  trigger_value JSONB DEFAULT '{}',
  reward_points INT DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User easter egg discoveries
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_user_easter_egg_finds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  easter_egg_id UUID REFERENCES public.miracle_learning_20260209_course_easter_eggs(id) ON DELETE CASCADE NOT NULL,
  found_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, easter_egg_id)
);

-- Study groups
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_study_groups (
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
CREATE TABLE IF NOT EXISTS public.miracle_learning_20260209_study_group_members (
  group_id UUID REFERENCES public.miracle_learning_20260209_study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- =============================================================
-- SECTION 8: INDEXES
-- =============================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS ml_idx_users_id_role ON public.miracle_learning_20260209_users(id, role);
CREATE INDEX IF NOT EXISTS ml_idx_workshop_checkins_user ON public.miracle_learning_20260209_workshop_checkins(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_workshop_checkins_workshop ON public.miracle_learning_20260209_workshop_checkins(workshop_id);
CREATE INDEX IF NOT EXISTS ml_idx_checkins_workshop_date ON public.miracle_learning_20260209_workshop_checkins(workshop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_checkins_user_date ON public.miracle_learning_20260209_workshop_checkins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_courses_published_order ON public.miracle_learning_20260209_courses(is_published, order_index);
CREATE INDEX IF NOT EXISTS ml_idx_courses_created ON public.miracle_learning_20260209_courses(created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_workshops_active_date ON public.miracle_learning_20260209_workshops(is_active, event_date DESC);
CREATE INDEX IF NOT EXISTS ml_idx_workshops_created ON public.miracle_learning_20260209_workshops(created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_chapters_course ON public.miracle_learning_20260209_chapters(course_id);
CREATE INDEX IF NOT EXISTS ml_idx_chapters_course_order ON public.miracle_learning_20260209_chapters(course_id, order_index);
CREATE INDEX IF NOT EXISTS ml_idx_lessons_chapter ON public.miracle_learning_20260209_lessons(chapter_id);
CREATE INDEX IF NOT EXISTS ml_idx_lessons_chapter_order ON public.miracle_learning_20260209_lessons(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS ml_idx_questions_lesson ON public.miracle_learning_20260209_questions(lesson_id);
CREATE INDEX IF NOT EXISTS ml_idx_questions_lesson_order ON public.miracle_learning_20260209_questions(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS ml_idx_user_answers_user ON public.miracle_learning_20260209_user_answers(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_user_answers_question ON public.miracle_learning_20260209_user_answers(question_id);
CREATE INDEX IF NOT EXISTS ml_idx_user_answers_user_correct ON public.miracle_learning_20260209_user_answers(user_id, is_correct);

-- Progress indexes
CREATE INDEX IF NOT EXISTS ml_idx_progress_user ON public.miracle_learning_20260209_user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_progress_course ON public.miracle_learning_20260209_user_lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS ml_idx_progress_user_course ON public.miracle_learning_20260209_user_lesson_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS ml_idx_progress_user_lesson ON public.miracle_learning_20260209_user_lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS ml_idx_progress_completed ON public.miracle_learning_20260209_user_lesson_progress(user_id, is_completed) WHERE is_completed = true;
CREATE INDEX IF NOT EXISTS ml_idx_progress_updated ON public.miracle_learning_20260209_user_lesson_progress(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_progress_complete_at ON public.miracle_learning_20260209_user_lesson_progress(marked_complete_at);
CREATE INDEX IF NOT EXISTS ml_idx_progress_user_course_complete ON public.miracle_learning_20260209_user_lesson_progress(user_id, course_id, marked_complete_at);

-- Points & gamification indexes
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_user_id ON public.miracle_learning_20260209_point_transactions(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_created ON public.miracle_learning_20260209_point_transactions(created_at);
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_action ON public.miracle_learning_20260209_point_transactions(action_type);
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_user_date ON public.miracle_learning_20260209_point_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_daily ON public.miracle_learning_20260209_point_transactions(user_id, action_type, created_at);
CREATE INDEX IF NOT EXISTS ml_idx_user_point_balance_total ON public.miracle_learning_20260209_user_point_balance(total_points DESC);
CREATE INDEX IF NOT EXISTS ml_idx_user_badges_user ON public.miracle_learning_20260209_user_badges(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_user_achievements_user ON public.miracle_learning_20260209_user_achievements(user_id);

-- Interaction indexes
CREATE INDEX IF NOT EXISTS ml_idx_likes_target ON public.miracle_learning_20260209_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS ml_idx_likes_user ON public.miracle_learning_20260209_likes(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_comments_target ON public.miracle_learning_20260209_comments(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_comments_user ON public.miracle_learning_20260209_comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_comments_parent ON public.miracle_learning_20260209_comments(parent_id);

-- Workshop interaction indexes
CREATE INDEX IF NOT EXISTS ml_idx_submissions_workshop ON public.miracle_learning_20260209_workshop_submissions(workshop_id);
CREATE INDEX IF NOT EXISTS ml_idx_submissions_user ON public.miracle_learning_20260209_workshop_submissions(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_submissions_status ON public.miracle_learning_20260209_workshop_submissions(status);
CREATE INDEX IF NOT EXISTS ml_idx_submissions_created ON public.miracle_learning_20260209_workshop_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_submissions_gallery ON public.miracle_learning_20260209_workshop_submissions(workshop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_instructor_apps_user ON public.miracle_learning_20260209_instructor_applications(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_instructor_apps_status ON public.miracle_learning_20260209_instructor_applications(status);
CREATE INDEX IF NOT EXISTS ml_idx_materials_workshop ON public.miracle_learning_20260209_workshop_materials(workshop_id);
CREATE INDEX IF NOT EXISTS ml_idx_feedback_workshop ON public.miracle_learning_20260209_workshop_feedback(workshop_id);

-- Course interaction indexes
CREATE INDEX IF NOT EXISTS ml_idx_course_reviews_course ON public.miracle_learning_20260209_course_reviews(course_id);
CREATE INDEX IF NOT EXISTS ml_idx_course_reviews_user ON public.miracle_learning_20260209_course_reviews(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_course_notes_course ON public.miracle_learning_20260209_course_notes(course_id);
CREATE INDEX IF NOT EXISTS ml_idx_course_notes_lesson ON public.miracle_learning_20260209_course_notes(lesson_id);
CREATE INDEX IF NOT EXISTS ml_idx_course_notes_user ON public.miracle_learning_20260209_course_notes(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_course ON public.miracle_learning_20260209_qa_questions(course_id);
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_lesson ON public.miracle_learning_20260209_qa_questions(lesson_id);
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_user ON public.miracle_learning_20260209_qa_questions(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_created ON public.miracle_learning_20260209_qa_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_qa_questions_course_resolved ON public.miracle_learning_20260209_qa_questions(course_id, is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_qa_answers_question ON public.miracle_learning_20260209_qa_answers(question_id);
CREATE INDEX IF NOT EXISTS ml_idx_qa_answers_user ON public.miracle_learning_20260209_qa_answers(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_qa_answers_featured ON public.miracle_learning_20260209_qa_answers(question_id) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS ml_idx_milestones_user ON public.miracle_learning_20260209_course_milestones(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_milestones_user_course ON public.miracle_learning_20260209_course_milestones(user_id, course_id);

-- AI tools indexes
CREATE INDEX IF NOT EXISTS ml_idx_tool_categories_order ON public.miracle_learning_20260209_tool_categories(order_index);
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_category ON public.miracle_learning_20260209_ai_tools(category_id, is_active);
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_featured ON public.miracle_learning_20260209_ai_tools(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_rating ON public.miracle_learning_20260209_ai_tools(avg_rating DESC);
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_active_featured ON public.miracle_learning_20260209_ai_tools(is_active, is_featured DESC, avg_rating DESC);
CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_tags ON public.miracle_learning_20260209_ai_tools USING GIN(tags);
CREATE INDEX IF NOT EXISTS ml_idx_tool_ratings_tool ON public.miracle_learning_20260209_tool_ratings(tool_id);
CREATE INDEX IF NOT EXISTS ml_idx_tool_experiences_tool ON public.miracle_learning_20260209_tool_experiences(tool_id);
CREATE INDEX IF NOT EXISTS ml_idx_tool_experiences_user ON public.miracle_learning_20260209_tool_experiences(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_tool_experiences_tool_status ON public.miracle_learning_20260209_tool_experiences(tool_id, status, is_featured DESC, like_count DESC);
CREATE INDEX IF NOT EXISTS ml_idx_tool_experiences_created ON public.miracle_learning_20260209_tool_experiences(created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_tool_cases_tool ON public.miracle_learning_20260209_tool_cases(tool_id, status);
CREATE INDEX IF NOT EXISTS ml_idx_tool_cases_user ON public.miracle_learning_20260209_tool_cases(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_tool_cases_status ON public.miracle_learning_20260209_tool_cases(status, is_featured DESC, like_count DESC);
CREATE INDEX IF NOT EXISTS ml_idx_tool_cases_tags ON public.miracle_learning_20260209_tool_cases USING GIN(tags);
CREATE INDEX IF NOT EXISTS ml_idx_tool_comparisons_user ON public.miracle_learning_20260209_tool_comparisons(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_user_bookmarks_user_type ON public.miracle_learning_20260209_user_bookmarks(user_id, target_type);
CREATE INDEX IF NOT EXISTS ml_idx_user_bookmarks_target ON public.miracle_learning_20260209_user_bookmarks(target_type, target_id);
CREATE INDEX IF NOT EXISTS ml_idx_weekly_picks_week ON public.miracle_learning_20260209_weekly_picks(week_start DESC);

-- Community indexes
CREATE INDEX IF NOT EXISTS ml_idx_discussions_user ON public.miracle_learning_20260209_discussions(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_discussions_created ON public.miracle_learning_20260209_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_discussions_pinned ON public.miracle_learning_20260209_discussions(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS ml_idx_discussions_status_pinned ON public.miracle_learning_20260209_discussions(status, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_discussions_tags ON public.miracle_learning_20260209_discussions USING GIN(tags);
CREATE INDEX IF NOT EXISTS ml_idx_discussions_popular ON public.miracle_learning_20260209_discussions(status, is_pinned DESC, comment_count DESC);
CREATE INDEX IF NOT EXISTS ml_idx_discussions_status_active ON public.miracle_learning_20260209_discussions(status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS ml_idx_invitations_inviter ON public.miracle_learning_20260209_user_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS ml_idx_invitations_code ON public.miracle_learning_20260209_user_invitations(invite_code);
CREATE INDEX IF NOT EXISTS ml_idx_invitations_invitee ON public.miracle_learning_20260209_user_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS ml_idx_reward_items_active ON public.miracle_learning_20260209_reward_items(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS ml_idx_reward_items_category ON public.miracle_learning_20260209_reward_items(category);
CREATE INDEX IF NOT EXISTS ml_idx_reward_orders_user ON public.miracle_learning_20260209_reward_orders(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_reward_orders_status ON public.miracle_learning_20260209_reward_orders(status);
CREATE INDEX IF NOT EXISTS ml_idx_certificates_user ON public.miracle_learning_20260209_certificates(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_certificates_number ON public.miracle_learning_20260209_certificates(certificate_number);

-- Articles & study groups indexes
CREATE INDEX IF NOT EXISTS ml_idx_articles_type_published ON public.miracle_learning_20260209_articles(type, is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_articles_author ON public.miracle_learning_20260209_articles(author_id);
CREATE INDEX IF NOT EXISTS ml_idx_article_reads_user ON public.miracle_learning_20260209_article_reads(user_id, article_id);
CREATE INDEX IF NOT EXISTS ml_idx_article_reads_article ON public.miracle_learning_20260209_article_reads(article_id);
CREATE INDEX IF NOT EXISTS ml_idx_easter_eggs_lesson ON public.miracle_learning_20260209_course_easter_eggs(lesson_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS ml_idx_egg_finds_user ON public.miracle_learning_20260209_user_easter_egg_finds(user_id);
CREATE INDEX IF NOT EXISTS ml_idx_study_groups_creator ON public.miracle_learning_20260209_study_groups(creator_id);
CREATE INDEX IF NOT EXISTS ml_idx_study_groups_active ON public.miracle_learning_20260209_study_groups(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS ml_idx_group_members_user ON public.miracle_learning_20260209_study_group_members(user_id);

-- =============================================================
-- SECTION 9: HELPER FUNCTIONS
-- =============================================================

-- Admin check function
CREATE OR REPLACE FUNCTION public.ml_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miracle_learning_20260209_users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Current user check function
CREATE OR REPLACE FUNCTION public.ml_is_current_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = target_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Authenticated check function
CREATE OR REPLACE FUNCTION public.ml_is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.ml_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Level calculation function
CREATE OR REPLACE FUNCTION public.ml_calculate_user_level(p_total_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF p_total_points >= 800 THEN RETURN 3;
  ELSIF p_total_points >= 300 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Email exists check function
CREATE OR REPLACE FUNCTION public.ml_check_email_exists(target_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.miracle_learning_20260209_users
    WHERE email = target_email
  ) INTO v_exists;
  PERFORM pg_sleep(0.05 + random() * 0.05);
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================
-- SECTION 10: CORE BUSINESS FUNCTIONS
-- =============================================================

-- Add user points (atomic, with daily limits)
CREATE OR REPLACE FUNCTION public.ml_add_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_total INTEGER;
  v_daily_limit INTEGER;
  v_new_balance INTEGER;
  v_actual_points INTEGER;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
    IF NOT public.ml_is_admin() THEN
      RAISE EXCEPTION 'Permission denied: cannot add points to other users';
    END IF;
  END IF;

  IF p_points <= 0 THEN
    v_actual_points := p_points;
  ELSE
    SELECT daily_limit INTO v_daily_limit
    FROM miracle_learning_20260209_point_rules
    WHERE action_type = p_action_type AND is_active = TRUE;

    SELECT COALESCE(SUM(points), 0) INTO v_daily_total
    FROM miracle_learning_20260209_point_transactions
    WHERE user_id = p_user_id AND points > 0 AND created_at >= CURRENT_DATE;

    IF v_daily_total >= 300 THEN RETURN 0; END IF;
    v_actual_points := LEAST(p_points, 300 - v_daily_total);

    IF v_daily_limit IS NOT NULL THEN
      DECLARE v_action_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_action_count
        FROM miracle_learning_20260209_point_transactions
        WHERE user_id = p_user_id AND action_type = p_action_type AND created_at >= CURRENT_DATE;
        IF v_action_count >= v_daily_limit THEN RETURN 0; END IF;
      END;
    END IF;
  END IF;

  IF v_actual_points = 0 THEN RETURN 0; END IF;

  INSERT INTO miracle_learning_20260209_point_transactions (user_id, points, action_type, reference_id, reference_type, description)
  VALUES (p_user_id, v_actual_points, p_action_type, p_reference_id, p_reference_type, p_description);

  INSERT INTO miracle_learning_20260209_user_point_balance (user_id, total_points, available_points, updated_at)
  VALUES (p_user_id, GREATEST(0, v_actual_points), GREATEST(0, v_actual_points), NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_points = CASE WHEN v_actual_points > 0 THEN miracle_learning_20260209_user_point_balance.total_points + v_actual_points ELSE miracle_learning_20260209_user_point_balance.total_points END,
    available_points = miracle_learning_20260209_user_point_balance.available_points + v_actual_points,
    spent_points = CASE WHEN v_actual_points < 0 THEN miracle_learning_20260209_user_point_balance.spent_points + ABS(v_actual_points) ELSE miracle_learning_20260209_user_point_balance.spent_points END,
    updated_at = NOW()
  RETURNING available_points INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Update user streak (atomic)
CREATE OR REPLACE FUNCTION public.ml_update_user_streak(p_user_id UUID)
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER, points_earned INTEGER, badge_unlocked TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_login DATE; v_current_streak INTEGER; v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE; v_points_earned INTEGER := 0; v_badge_unlocked TEXT := NULL;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied: can only update own streak';
  END IF;

  INSERT INTO miracle_learning_20260209_user_streaks (user_id, current_streak, longest_streak, last_login_date, streak_start_date)
  VALUES (p_user_id, 0, 0, NULL, NULL) ON CONFLICT (user_id) DO NOTHING;

  SELECT us.last_login_date, us.current_streak, us.longest_streak
  INTO v_last_login, v_current_streak, v_longest_streak
  FROM miracle_learning_20260209_user_streaks us WHERE us.user_id = p_user_id;

  IF v_last_login = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, 0, NULL::TEXT; RETURN;
  END IF;

  IF v_last_login IS NULL OR v_last_login < v_today - 1 THEN
    v_current_streak := 1;
    UPDATE miracle_learning_20260209_user_streaks SET current_streak = 1, last_login_date = v_today, streak_start_date = v_today, updated_at = NOW() WHERE user_id = p_user_id;
  ELSE
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN v_longest_streak := v_current_streak; END IF;
    UPDATE miracle_learning_20260209_user_streaks SET current_streak = v_current_streak, longest_streak = v_longest_streak, last_login_date = v_today, updated_at = NOW() WHERE user_id = p_user_id;
  END IF;

  v_points_earned := public.ml_add_user_points(p_user_id, 5, 'DAILY_LOGIN', NULL, NULL, '每日登录奖励');

  IF v_current_streak = 7 THEN
    v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 50, 'WEEKLY_STREAK', NULL, NULL, '连续登录7天奖励');
    v_badge_unlocked := 'STREAK_7';
  ELSIF v_current_streak = 30 THEN
    v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 200, 'MONTHLY_STREAK', NULL, NULL, '连续登录30天奖励');
    v_badge_unlocked := 'STREAK_30';
  ELSIF v_current_streak = 100 THEN
    v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 500, 'STREAK_100', NULL, NULL, '连续登录100天奖励');
    v_badge_unlocked := 'STREAK_100';
  END IF;

  IF v_badge_unlocked IS NOT NULL THEN
    INSERT INTO miracle_learning_20260209_user_badges (user_id, badge_id)
    SELECT p_user_id, b.id FROM miracle_learning_20260209_badges b WHERE b.code = v_badge_unlocked
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_points_earned, v_badge_unlocked;
END;
$$ LANGUAGE plpgsql;

-- Mark lesson complete (atomic)
CREATE OR REPLACE FUNCTION public.ml_mark_lesson_complete(
  p_user_id UUID, p_lesson_id UUID, p_course_id UUID
) RETURNS JSONB
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_points_earned INTEGER := 0; v_milestone_unlocked TEXT := NULL; v_already_completed BOOLEAN;
  v_total_lessons INTEGER; v_completed_lessons INTEGER; v_progress_percentage NUMERIC; v_today_completed INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id AND NOT public.ml_is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT EXISTS (SELECT 1 FROM miracle_learning_20260209_user_lesson_progress WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND is_completed = TRUE) INTO v_already_completed;
  IF v_already_completed THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true, 'points_earned', 0, 'milestone', null);
  END IF;

  INSERT INTO miracle_learning_20260209_user_lesson_progress (user_id, lesson_id, course_id, is_completed, marked_complete_at)
  VALUES (p_user_id, p_lesson_id, p_course_id, TRUE, NOW())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_completed = TRUE, marked_complete_at = NOW();

  v_points_earned := public.ml_add_user_points(p_user_id, 50, 'LESSON_MARK_COMPLETE', p_lesson_id, 'lesson', '完成课时');

  SELECT COUNT(*) INTO v_total_lessons FROM miracle_learning_20260209_lessons l JOIN miracle_learning_20260209_chapters c ON l.chapter_id = c.id WHERE c.course_id = p_course_id;
  SELECT COUNT(*) INTO v_completed_lessons FROM miracle_learning_20260209_user_lesson_progress ulp JOIN miracle_learning_20260209_lessons l ON ulp.lesson_id = l.id JOIN miracle_learning_20260209_chapters c ON l.chapter_id = c.id WHERE ulp.user_id = p_user_id AND c.course_id = p_course_id AND ulp.is_completed = TRUE;

  IF v_total_lessons > 0 THEN
    v_progress_percentage := (v_completed_lessons::NUMERIC / v_total_lessons) * 100;
    IF v_progress_percentage >= 50 THEN
      INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type) VALUES (p_user_id, p_course_id, '50_percent') ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      IF FOUND THEN v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 100, 'COURSE_50_PERCENT', p_course_id, 'course', '课程完成 50%'); v_milestone_unlocked := '50_percent'; END IF;
    END IF;
    IF v_progress_percentage >= 100 THEN
      INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type) VALUES (p_user_id, p_course_id, '100_percent') ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
      IF FOUND THEN v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 300, 'COURSE_100_PERCENT', p_course_id, 'course', '课程完成 100%'); v_milestone_unlocked := '100_percent'; END IF;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_today_completed FROM miracle_learning_20260209_user_lesson_progress WHERE user_id = p_user_id AND course_id = p_course_id AND marked_complete_at >= CURRENT_DATE AND is_completed = TRUE;
  IF v_today_completed >= 3 THEN
    INSERT INTO miracle_learning_20260209_course_milestones (user_id, course_id, milestone_type) VALUES (p_user_id, p_course_id, 'marathon') ON CONFLICT (user_id, course_id, milestone_type) DO NOTHING;
    IF FOUND THEN v_points_earned := v_points_earned + public.ml_add_user_points(p_user_id, 100, 'COURSE_MARATHON', p_course_id, 'course', '马拉松成就'); IF v_milestone_unlocked IS NULL THEN v_milestone_unlocked := 'marathon'; END IF; END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_completed', false, 'points_earned', v_points_earned, 'milestone', v_milestone_unlocked, 'progress', jsonb_build_object('completed', v_completed_lessons, 'total', v_total_lessons, 'percentage', ROUND(v_progress_percentage, 2)));
END;
$$ LANGUAGE plpgsql;

-- Upsert lesson time spent (atomic)
CREATE OR REPLACE FUNCTION public.ml_upsert_lesson_time_spent(
  p_user_id UUID, p_lesson_id UUID, p_course_id UUID, p_time_spent INTEGER
) RETURNS INTEGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot update other user progress';
  END IF;
  INSERT INTO miracle_learning_20260209_user_lesson_progress (user_id, lesson_id, course_id, time_spent, updated_at)
  VALUES (p_user_id, p_lesson_id, p_course_id, p_time_spent, NOW())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET time_spent = GREATEST(miracle_learning_20260209_user_lesson_progress.time_spent, EXCLUDED.time_spent), updated_at = NOW()
  RETURNING time_spent INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Accept answer (atomic)
CREATE OR REPLACE FUNCTION public.ml_accept_answer(p_question_id UUID, p_answer_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_bounty INTEGER; v_answerer_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM miracle_learning_20260209_qa_questions WHERE id = p_question_id AND user_id = p_user_id AND is_resolved = FALSE) THEN RETURN FALSE; END IF;
  SELECT user_id INTO v_answerer_id FROM miracle_learning_20260209_qa_answers WHERE id = p_answer_id AND question_id = p_question_id;
  IF v_answerer_id IS NULL THEN RETURN FALSE; END IF;
  SELECT bounty_points INTO v_bounty FROM miracle_learning_20260209_qa_questions WHERE id = p_question_id;
  UPDATE miracle_learning_20260209_qa_questions SET is_resolved = TRUE, accepted_answer_id = p_answer_id, updated_at = NOW() WHERE id = p_question_id;
  UPDATE miracle_learning_20260209_qa_answers SET is_accepted = TRUE, updated_at = NOW() WHERE id = p_answer_id;
  IF v_bounty > 0 THEN PERFORM public.ml_add_user_points(v_answerer_id, v_bounty, 'BOUNTY_REWARD', p_answer_id, 'answer', '问答悬赏奖励'); END IF;
  PERFORM public.ml_add_user_points(v_answerer_id, 30, 'COURSE_ANSWER', p_answer_id, 'answer', '回答被采纳');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get user course progress
CREATE OR REPLACE FUNCTION public.ml_get_user_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (total_lessons BIGINT, completed_lessons BIGINT, total_time_spent BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized: cannot query other user progress'; END IF;
  RETURN QUERY
  SELECT COUNT(l.id) AS total_lessons, COUNT(ulp.id) FILTER (WHERE ulp.is_completed = true) AS completed_lessons, COALESCE(SUM(ulp.time_spent), 0) AS total_time_spent
  FROM miracle_learning_20260209_lessons l
  JOIN miracle_learning_20260209_chapters c ON c.id = l.chapter_id
  LEFT JOIN miracle_learning_20260209_user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = p_user_id
  WHERE c.course_id = p_course_id;
END;
$$;

-- Submit course review (atomic)
CREATE OR REPLACE FUNCTION public.ml_submit_course_review(p_user_id UUID, p_course_id UUID, p_content TEXT) RETURNS JSONB AS $$
DECLARE v_review_id UUID;
BEGIN
  INSERT INTO miracle_learning_20260209_course_reviews (user_id, course_id, content) VALUES (p_user_id, p_course_id, p_content) RETURNING id INTO v_review_id;
  PERFORM ml_add_user_points(p_user_id, 30, 'COURSE_REVIEW', p_course_id::text::uuid, 'course', '发表课程感想');
  RETURN jsonb_build_object('success', true, 'reviewId', v_review_id);
EXCEPTION
  WHEN unique_violation THEN RETURN jsonb_build_object('success', false, 'error', '你已经发表过这门课程的感想了');
  WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', '提交失败，请稍后重试');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Submit question with bounty (atomic)
CREATE OR REPLACE FUNCTION public.ml_submit_question_with_bounty(p_user_id UUID, p_lesson_id UUID, p_title TEXT, p_content TEXT, p_bounty INT DEFAULT 0) RETURNS JSONB AS $$
DECLARE v_balance INT; v_question_id UUID;
BEGIN
  IF p_bounty > 500 THEN RETURN jsonb_build_object('success', false, 'error', '悬赏上限为 500 积分'); END IF;
  IF p_bounty > 0 THEN
    SELECT available_points INTO v_balance FROM miracle_learning_20260209_user_point_balance WHERE user_id = p_user_id;
    IF v_balance IS NULL OR v_balance < p_bounty THEN RETURN jsonb_build_object('success', false, 'error', '积分不足'); END IF;
    PERFORM ml_add_user_points(p_user_id, -p_bounty, 'SPEND', NULL, NULL, '悬赏提问');
  END IF;
  INSERT INTO miracle_learning_20260209_qa_questions (user_id, lesson_id, title, content, bounty_points) VALUES (p_user_id, p_lesson_id, p_title, p_content, p_bounty) RETURNING id INTO v_question_id;
  PERFORM ml_add_user_points(p_user_id, 10, 'COURSE_QUESTION', v_question_id::text::uuid, 'question', '提出问题');
  RETURN jsonb_build_object('success', true, 'questionId', v_question_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', '提交失败，请稍后重试');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Submit answer (atomic)
CREATE OR REPLACE FUNCTION public.ml_submit_answer(p_user_id UUID, p_question_id UUID, p_content TEXT) RETURNS JSONB AS $$
DECLARE v_answer_id UUID;
BEGIN
  INSERT INTO miracle_learning_20260209_qa_answers (user_id, question_id, content) VALUES (p_user_id, p_question_id, p_content) RETURNING id INTO v_answer_id;
  PERFORM ml_add_user_points(p_user_id, 15, 'COURSE_ANSWER', v_answer_id::text::uuid, 'answer', '回答问题');
  RETURN jsonb_build_object('success', true, 'answerId', v_answer_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', '提交失败，请稍后重试');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get today points sum
CREATE OR REPLACE FUNCTION public.ml_get_today_points_sum(p_user_id UUID) RETURNS INT AS $$
  SELECT COALESCE(SUM(points), 0)::INT FROM miracle_learning_20260209_point_transactions WHERE user_id = p_user_id AND created_at >= CURRENT_DATE AND points > 0;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Generate invite code
CREATE OR REPLACE FUNCTION public.ml_generate_invite_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE v_code TEXT; v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM miracle_learning_20260209_user_invitations WHERE invite_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      INSERT INTO miracle_learning_20260209_user_invitations (inviter_id, invite_code) VALUES (p_user_id, v_code);
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate certificate number
CREATE SEQUENCE IF NOT EXISTS ml_certificate_number_seq START 1;

CREATE OR REPLACE FUNCTION public.ml_generate_certificate_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ML' || to_char(NOW(), 'YYYY') || lpad(nextval('ml_certificate_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Increment discussion view count
CREATE OR REPLACE FUNCTION public.ml_increment_discussion_view_count(p_discussion_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE miracle_learning_20260209_discussions SET view_count = view_count + 1 WHERE id = p_discussion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get workshop progress
CREATE OR REPLACE FUNCTION public.ml_get_workshop_progress(p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_checkin_count INT; v_total_workshops INT; v_quarter_start DATE;
BEGIN
  v_quarter_start := date_trunc('quarter', CURRENT_DATE)::date;
  SELECT COUNT(*) INTO v_checkin_count FROM miracle_learning_20260209_workshop_checkins wc JOIN miracle_learning_20260209_workshops w ON w.id = wc.workshop_id WHERE wc.user_id = p_user_id AND w.event_date >= v_quarter_start;
  SELECT COUNT(*) INTO v_total_workshops FROM miracle_learning_20260209_workshops WHERE event_date >= v_quarter_start AND is_active = TRUE;
  IF v_total_workshops = 0 THEN v_total_workshops := 6; END IF;
  RETURN json_build_object('checkin_count', v_checkin_count, 'total_workshops', v_total_workshops, 'quarter_start', v_quarter_start);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get course completion count
CREATE OR REPLACE FUNCTION public.ml_get_course_completion_count(p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_completed INT; v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM miracle_learning_20260209_courses WHERE is_published = TRUE;
  SELECT COUNT(DISTINCT c.id) INTO v_completed FROM miracle_learning_20260209_courses c
  WHERE c.is_published = TRUE AND NOT EXISTS (
    SELECT 1 FROM miracle_learning_20260209_chapters ch JOIN miracle_learning_20260209_lessons l ON l.chapter_id = ch.id WHERE ch.course_id = c.id AND NOT EXISTS (
      SELECT 1 FROM miracle_learning_20260209_user_lesson_progress ulp WHERE ulp.lesson_id = l.id AND ulp.user_id = p_user_id AND ulp.is_completed = TRUE
    )
  ) AND EXISTS (SELECT 1 FROM miracle_learning_20260209_chapters ch2 JOIN miracle_learning_20260209_lessons l2 ON l2.chapter_id = ch2.id WHERE ch2.course_id = c.id);
  RETURN json_build_object('completed', v_completed, 'total', GREATEST(v_total, 6));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get user portfolio stats
CREATE OR REPLACE FUNCTION public.ml_get_user_portfolio_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_submissions INT; v_experiences INT; v_cases INT; v_notes INT; v_total_likes INT;
BEGIN
  SELECT COUNT(*) INTO v_submissions FROM miracle_learning_20260209_workshop_submissions WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_experiences FROM miracle_learning_20260209_tool_experiences WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_cases FROM miracle_learning_20260209_tool_cases WHERE user_id = p_user_id AND status = 'approved';
  SELECT COUNT(*) INTO v_notes FROM miracle_learning_20260209_course_notes WHERE user_id = p_user_id AND is_public = TRUE;
  SELECT COALESCE(SUM(cnt), 0) INTO v_total_likes FROM (
    SELECT COUNT(*) as cnt FROM miracle_learning_20260209_likes WHERE target_type = 'submission' AND target_id::uuid IN (SELECT id FROM miracle_learning_20260209_workshop_submissions WHERE user_id = p_user_id)
    UNION ALL
    SELECT COUNT(*) as cnt FROM miracle_learning_20260209_likes WHERE target_type = 'note' AND target_id::uuid IN (SELECT id FROM miracle_learning_20260209_course_notes WHERE user_id = p_user_id)
  ) t;
  RETURN json_build_object('submissions', v_submissions, 'experiences', v_experiences, 'cases', v_cases, 'notes', v_notes, 'total_likes', v_total_likes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get weekly top gainers
CREATE OR REPLACE FUNCTION public.ml_get_weekly_top_gainers()
RETURNS JSON AS $$
BEGIN
  RETURN (SELECT json_agg(t) FROM (
    SELECT pt.user_id, u.name, u.avatar_url, SUM(pt.points) as weekly_points
    FROM miracle_learning_20260209_point_transactions pt
    JOIN miracle_learning_20260209_users u ON u.id = pt.user_id
    WHERE pt.created_at >= date_trunc('week', NOW()) AND pt.points > 0 AND u.role != 'admin'
    GROUP BY pt.user_id, u.name, u.avatar_url ORDER BY weekly_points DESC LIMIT 3
  ) t);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================
-- SECTION 11: TRIGGER FUNCTIONS
-- =============================================================

-- Like count trigger
CREATE OR REPLACE FUNCTION public.ml_update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'submission' THEN UPDATE miracle_learning_20260209_workshop_submissions SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    IF NEW.target_type = 'comment' THEN UPDATE miracle_learning_20260209_comments SET like_count = like_count + 1 WHERE id = NEW.target_id; END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'submission' THEN UPDATE miracle_learning_20260209_workshop_submissions SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    IF OLD.target_type = 'comment' THEN UPDATE miracle_learning_20260209_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comment count trigger
CREATE OR REPLACE FUNCTION public.ml_update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'submission' THEN UPDATE miracle_learning_20260209_workshop_submissions SET comment_count = COALESCE(comment_count, 0) + 1 WHERE id = NEW.target_id::uuid; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'submission' THEN UPDATE miracle_learning_20260209_workshop_submissions SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) WHERE id = OLD.target_id::uuid; END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Answer count trigger
CREATE OR REPLACE FUNCTION public.ml_update_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE miracle_learning_20260209_qa_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN UPDATE miracle_learning_20260209_qa_questions SET answer_count = GREATEST(0, answer_count - 1) WHERE id = OLD.question_id; RETURN OLD;
  END IF; RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Discussion comment count trigger
CREATE OR REPLACE FUNCTION public.ml_update_discussion_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'discussion' THEN
    UPDATE miracle_learning_20260209_discussions SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = NEW.target_id;
    INSERT INTO miracle_learning_20260209_discussion_participants (user_id, discussion_id) VALUES (NEW.user_id, NEW.target_id) ON CONFLICT DO NOTHING;
    UPDATE miracle_learning_20260209_discussions SET participant_count = (SELECT COUNT(*) FROM miracle_learning_20260209_discussion_participants WHERE discussion_id = NEW.target_id) WHERE id = NEW.target_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE AND NEW.target_type = 'discussion' THEN
    UPDATE miracle_learning_20260209_discussions SET comment_count = GREATEST(0, comment_count - 1), updated_at = NOW() WHERE id = NEW.target_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'discussion' THEN
    UPDATE miracle_learning_20260209_discussions SET comment_count = GREATEST(0, comment_count - 1), updated_at = NOW() WHERE id = OLD.target_id; RETURN OLD;
  END IF; RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Discussion like count trigger
CREATE OR REPLACE FUNCTION public.ml_update_discussion_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'discussion' THEN UPDATE miracle_learning_20260209_discussions SET like_count = like_count + 1 WHERE id = NEW.target_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'discussion' THEN UPDATE miracle_learning_20260209_discussions SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id; RETURN OLD;
  END IF; RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Tool rating stats trigger
CREATE OR REPLACE FUNCTION public.ml_update_tool_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE miracle_learning_20260209_ai_tools SET avg_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM miracle_learning_20260209_tool_ratings WHERE tool_id = NEW.tool_id), rating_count = (SELECT COUNT(*) FROM miracle_learning_20260209_tool_ratings WHERE tool_id = NEW.tool_id), updated_at = NOW() WHERE id = NEW.tool_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE miracle_learning_20260209_ai_tools SET avg_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM miracle_learning_20260209_tool_ratings WHERE tool_id = OLD.tool_id), 0), rating_count = (SELECT COUNT(*) FROM miracle_learning_20260209_tool_ratings WHERE tool_id = OLD.tool_id), updated_at = NOW() WHERE id = OLD.tool_id; RETURN OLD;
  END IF; RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Tool experience count trigger
CREATE OR REPLACE FUNCTION public.ml_update_tool_experience_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE miracle_learning_20260209_ai_tools SET experience_count = experience_count + 1, updated_at = NOW() WHERE id = NEW.tool_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN UPDATE miracle_learning_20260209_ai_tools SET experience_count = GREATEST(0, experience_count - 1), updated_at = NOW() WHERE id = OLD.tool_id; RETURN OLD;
  END IF; RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Tool case count trigger
CREATE OR REPLACE FUNCTION public.ml_update_tool_case_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN UPDATE miracle_learning_20260209_ai_tools SET case_count = case_count + 1, updated_at = NOW() WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN UPDATE miracle_learning_20260209_ai_tools SET case_count = case_count + 1, updated_at = NOW() WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'approved' AND OLD.status = 'approved' THEN UPDATE miracle_learning_20260209_ai_tools SET case_count = GREATEST(0, case_count - 1), updated_at = NOW() WHERE id = NEW.tool_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN UPDATE miracle_learning_20260209_ai_tools SET case_count = GREATEST(0, case_count - 1), updated_at = NOW() WHERE id = OLD.tool_id;
  END IF; RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- New user handler (for auth.users trigger)
CREATE OR REPLACE FUNCTION public.ml_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.miracle_learning_20260209_users (id, email, name, avatar_url, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url', COALESCE(NEW.raw_app_meta_data->>'role', 'user'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.miracle_learning_20260209_user_point_balance (user_id, total_points, available_points, spent_points, level) VALUES (NEW.id, 0, 0, 0, 1) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.miracle_learning_20260209_user_streaks (user_id, current_streak, longest_streak) VALUES (NEW.id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Study group member count trigger
CREATE OR REPLACE FUNCTION public.ml_update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE miracle_learning_20260209_study_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE miracle_learning_20260209_study_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
  END IF; RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Refresh leaderboard function
CREATE OR REPLACE FUNCTION public.ml_refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.ml_leaderboard_view;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- SECTION 12: CREATE TRIGGERS
-- =============================================================

-- updated_at triggers
DROP TRIGGER IF EXISTS ml_trigger_users_updated_at ON public.miracle_learning_20260209_users;
CREATE TRIGGER ml_trigger_users_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_users FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_courses_updated_at ON public.miracle_learning_20260209_courses;
CREATE TRIGGER ml_trigger_courses_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_courses FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_workshops_updated_at ON public.miracle_learning_20260209_workshops;
CREATE TRIGGER ml_trigger_workshops_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_workshops FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_chapters_updated_at ON public.miracle_learning_20260209_chapters;
CREATE TRIGGER ml_trigger_chapters_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_chapters FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_lessons_updated_at ON public.miracle_learning_20260209_lessons;
CREATE TRIGGER ml_trigger_lessons_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_lessons FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_questions_updated_at ON public.miracle_learning_20260209_questions;
CREATE TRIGGER ml_trigger_questions_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_questions FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_progress_updated_at ON public.miracle_learning_20260209_user_lesson_progress;
CREATE TRIGGER ml_trigger_progress_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_user_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_workshop_materials_updated_at ON public.miracle_learning_20260209_workshop_materials;
CREATE TRIGGER ml_trigger_workshop_materials_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_workshop_materials FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_articles_updated_at ON public.miracle_learning_20260209_articles;
CREATE TRIGGER ml_trigger_articles_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_articles FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

DROP TRIGGER IF EXISTS ml_trigger_study_groups_updated_at ON public.miracle_learning_20260209_study_groups;
CREATE TRIGGER ml_trigger_study_groups_updated_at BEFORE UPDATE ON public.miracle_learning_20260209_study_groups FOR EACH ROW EXECUTE FUNCTION public.ml_update_updated_at_column();

-- Business logic triggers
DROP TRIGGER IF EXISTS ml_trigger_update_like_count ON public.miracle_learning_20260209_likes;
CREATE TRIGGER ml_trigger_update_like_count AFTER INSERT OR DELETE ON public.miracle_learning_20260209_likes FOR EACH ROW EXECUTE FUNCTION public.ml_update_like_count();

DROP TRIGGER IF EXISTS ml_trigger_update_comment_count ON public.miracle_learning_20260209_comments;
CREATE TRIGGER ml_trigger_update_comment_count AFTER INSERT OR DELETE ON public.miracle_learning_20260209_comments FOR EACH ROW EXECUTE FUNCTION public.ml_update_comment_count();

DROP TRIGGER IF EXISTS ml_trigger_update_answer_count ON public.miracle_learning_20260209_qa_answers;
CREATE TRIGGER ml_trigger_update_answer_count AFTER INSERT OR DELETE ON public.miracle_learning_20260209_qa_answers FOR EACH ROW EXECUTE FUNCTION public.ml_update_answer_count();

DROP TRIGGER IF EXISTS ml_trigger_discussion_comment_insert ON public.miracle_learning_20260209_comments;
CREATE TRIGGER ml_trigger_discussion_comment_insert AFTER INSERT ON public.miracle_learning_20260209_comments FOR EACH ROW WHEN (NEW.target_type = 'discussion') EXECUTE FUNCTION public.ml_update_discussion_comment_count();

DROP TRIGGER IF EXISTS ml_trigger_discussion_comment_delete ON public.miracle_learning_20260209_comments;
CREATE TRIGGER ml_trigger_discussion_comment_delete AFTER DELETE ON public.miracle_learning_20260209_comments FOR EACH ROW WHEN (OLD.target_type = 'discussion') EXECUTE FUNCTION public.ml_update_discussion_comment_count();

DROP TRIGGER IF EXISTS ml_trigger_discussion_comment_update ON public.miracle_learning_20260209_comments;
CREATE TRIGGER ml_trigger_discussion_comment_update AFTER UPDATE OF is_deleted ON public.miracle_learning_20260209_comments FOR EACH ROW WHEN (NEW.target_type = 'discussion' OR OLD.target_type = 'discussion') EXECUTE FUNCTION public.ml_update_discussion_comment_count();

DROP TRIGGER IF EXISTS ml_trigger_discussion_like_insert ON public.miracle_learning_20260209_likes;
CREATE TRIGGER ml_trigger_discussion_like_insert AFTER INSERT ON public.miracle_learning_20260209_likes FOR EACH ROW WHEN (NEW.target_type = 'discussion') EXECUTE FUNCTION public.ml_update_discussion_like_count();

DROP TRIGGER IF EXISTS ml_trigger_discussion_like_delete ON public.miracle_learning_20260209_likes;
CREATE TRIGGER ml_trigger_discussion_like_delete AFTER DELETE ON public.miracle_learning_20260209_likes FOR EACH ROW WHEN (OLD.target_type = 'discussion') EXECUTE FUNCTION public.ml_update_discussion_like_count();

DROP TRIGGER IF EXISTS ml_trigger_update_tool_rating ON public.miracle_learning_20260209_tool_ratings;
CREATE TRIGGER ml_trigger_update_tool_rating AFTER INSERT OR UPDATE OR DELETE ON public.miracle_learning_20260209_tool_ratings FOR EACH ROW EXECUTE FUNCTION public.ml_update_tool_rating_stats();

DROP TRIGGER IF EXISTS ml_trigger_update_tool_exp_count ON public.miracle_learning_20260209_tool_experiences;
CREATE TRIGGER ml_trigger_update_tool_exp_count AFTER INSERT OR DELETE ON public.miracle_learning_20260209_tool_experiences FOR EACH ROW EXECUTE FUNCTION public.ml_update_tool_experience_count();

DROP TRIGGER IF EXISTS ml_trigger_update_tool_case_count ON public.miracle_learning_20260209_tool_cases;
CREATE TRIGGER ml_trigger_update_tool_case_count AFTER INSERT OR UPDATE OF status OR DELETE ON public.miracle_learning_20260209_tool_cases FOR EACH ROW EXECUTE FUNCTION public.ml_update_tool_case_count();

DROP TRIGGER IF EXISTS ml_trigger_group_member_count ON public.miracle_learning_20260209_study_group_members;
CREATE TRIGGER ml_trigger_group_member_count AFTER INSERT OR DELETE ON public.miracle_learning_20260209_study_group_members FOR EACH ROW EXECUTE FUNCTION public.ml_update_group_member_count();

-- CRITICAL: auth.users trigger - uses unique name, does NOT drop any OTHER project's triggers
-- Only drops our own ml_on_auth_user_created if it already exists (idempotent)
DROP TRIGGER IF EXISTS ml_on_auth_user_created ON auth.users;
CREATE TRIGGER ml_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ml_handle_new_user();

-- =============================================================
-- SECTION 13: MATERIALIZED VIEW & VIEWS
-- =============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.ml_leaderboard_view AS
SELECT
  u.id, u.name, u.avatar_url,
  COALESCE(upb.total_points, 0) as total_points,
  COALESCE(upb.level, 1) as level,
  COALESCE(us.current_streak, 0) as current_streak,
  (SELECT COUNT(*) FROM miracle_learning_20260209_user_badges ub WHERE ub.user_id = u.id) as badge_count,
  ROW_NUMBER() OVER (ORDER BY COALESCE(upb.total_points, 0) DESC) as rank
FROM miracle_learning_20260209_users u
LEFT JOIN miracle_learning_20260209_user_point_balance upb ON u.id = upb.user_id
LEFT JOIN miracle_learning_20260209_user_streaks us ON u.id = us.user_id
WHERE u.role != 'admin'
ORDER BY total_points DESC;

CREATE UNIQUE INDEX IF NOT EXISTS ml_idx_leaderboard_view_id ON public.ml_leaderboard_view(id);

CREATE OR REPLACE VIEW public.ml_leaderboard_safe_view AS
SELECT
  u.id, u.name, u.avatar_url,
  COALESCE(b.total_points, 0) AS total_points,
  COALESCE(s.current_streak, 0) AS current_streak,
  COALESCE(s.longest_streak, 0) AS longest_streak
FROM public.miracle_learning_20260209_users u
LEFT JOIN public.miracle_learning_20260209_user_point_balance b ON u.id = b.user_id
LEFT JOIN public.miracle_learning_20260209_user_streaks s ON u.id = s.user_id
ORDER BY COALESCE(b.total_points, 0) DESC;

-- =============================================================
-- SECTION 14: ROW LEVEL SECURITY
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE public.miracle_learning_20260209_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_workshop_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_point_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_workshop_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_instructor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_workshop_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_workshop_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_course_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_note_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_qa_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_course_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_tool_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_tool_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_tool_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_tool_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_weekly_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_discussion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_reward_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_article_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_course_easter_eggs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_user_easter_egg_finds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miracle_learning_20260209_study_group_members ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "[ML] Users can view own profile" ON public.miracle_learning_20260209_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "[ML] Users can update own profile" ON public.miracle_learning_20260209_users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "[ML] Users can insert own profile" ON public.miracle_learning_20260209_users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "[ML] Admins can view all users" ON public.miracle_learning_20260209_users FOR SELECT USING (public.ml_is_admin());

-- Workshops policies
CREATE POLICY "[ML] View active workshops" ON public.miracle_learning_20260209_workshops FOR SELECT USING (is_active = true OR public.ml_is_admin());
CREATE POLICY "[ML] Admins manage workshops" ON public.miracle_learning_20260209_workshops FOR ALL USING (public.ml_is_admin());

-- Workshop checkins policies
CREATE POLICY "[ML] View all checkins" ON public.miracle_learning_20260209_workshop_checkins FOR SELECT USING (true);
CREATE POLICY "[ML] Create own checkins" ON public.miracle_learning_20260209_workshop_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Delete own checkins" ON public.miracle_learning_20260209_workshop_checkins FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins delete checkins" ON public.miracle_learning_20260209_workshop_checkins FOR DELETE USING (public.ml_is_admin());

-- Courses policies
CREATE POLICY "[ML] View published courses" ON public.miracle_learning_20260209_courses FOR SELECT USING (is_published = true OR public.ml_is_admin());
CREATE POLICY "[ML] Admins manage courses" ON public.miracle_learning_20260209_courses FOR ALL USING (public.ml_is_admin());

-- Chapters policies
CREATE POLICY "[ML] View chapters" ON public.miracle_learning_20260209_chapters FOR SELECT USING (EXISTS (SELECT 1 FROM public.miracle_learning_20260209_courses WHERE id = course_id AND is_published = true) OR public.ml_is_admin());
CREATE POLICY "[ML] Admins manage chapters" ON public.miracle_learning_20260209_chapters FOR ALL USING (public.ml_is_admin());

-- Lessons policies
CREATE POLICY "[ML] View lessons" ON public.miracle_learning_20260209_lessons FOR SELECT USING (EXISTS (SELECT 1 FROM public.miracle_learning_20260209_chapters c JOIN public.miracle_learning_20260209_courses co ON c.course_id = co.id WHERE c.id = chapter_id AND co.is_published = true) OR public.ml_is_admin());
CREATE POLICY "[ML] Admins manage lessons" ON public.miracle_learning_20260209_lessons FOR ALL USING (public.ml_is_admin());

-- Questions policies
CREATE POLICY "[ML] View questions" ON public.miracle_learning_20260209_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.miracle_learning_20260209_lessons l JOIN public.miracle_learning_20260209_chapters c ON l.chapter_id = c.id JOIN public.miracle_learning_20260209_courses co ON c.course_id = co.id WHERE l.id = lesson_id AND co.is_published = true) OR public.ml_is_admin());
CREATE POLICY "[ML] Admins manage questions" ON public.miracle_learning_20260209_questions FOR ALL USING (public.ml_is_admin());

-- User answers policies
CREATE POLICY "[ML] View own answers" ON public.miracle_learning_20260209_user_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] Create own answers" ON public.miracle_learning_20260209_user_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own answers" ON public.miracle_learning_20260209_user_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins view answers" ON public.miracle_learning_20260209_user_answers FOR SELECT USING (public.ml_is_admin());

-- Progress policies
CREATE POLICY "[ML] View own progress" ON public.miracle_learning_20260209_user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] Create own progress" ON public.miracle_learning_20260209_user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own progress" ON public.miracle_learning_20260209_user_lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins view progress" ON public.miracle_learning_20260209_user_lesson_progress FOR SELECT USING (public.ml_is_admin());
CREATE POLICY "[ML] Admins delete progress" ON public.miracle_learning_20260209_user_lesson_progress FOR DELETE USING (public.ml_is_admin());

-- Point rules policies
CREATE POLICY "[ML] Anyone reads rules" ON public.miracle_learning_20260209_point_rules FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Admins manage rules" ON public.miracle_learning_20260209_point_rules FOR ALL USING (public.ml_is_admin());

-- Point balance policies
CREATE POLICY "[ML] View all balances" ON public.miracle_learning_20260209_user_point_balance FOR SELECT USING (TRUE);

-- Point transactions policies
CREATE POLICY "[ML] View own transactions" ON public.miracle_learning_20260209_point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins view transactions" ON public.miracle_learning_20260209_point_transactions FOR SELECT USING (public.ml_is_admin());

-- Streaks policies
CREATE POLICY "[ML] View all streaks" ON public.miracle_learning_20260209_user_streaks FOR SELECT USING (TRUE);

-- Badges policies
CREATE POLICY "[ML] Anyone views badges" ON public.miracle_learning_20260209_badges FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Admins manage badges" ON public.miracle_learning_20260209_badges FOR ALL USING (public.ml_is_admin());

-- User badges policies
CREATE POLICY "[ML] View all user badges" ON public.miracle_learning_20260209_user_badges FOR SELECT USING (TRUE);

-- Achievements policies
CREATE POLICY "[ML] Anyone views achievements" ON public.miracle_learning_20260209_achievements FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Admins manage achievements" ON public.miracle_learning_20260209_achievements FOR ALL USING (public.ml_is_admin());

-- User achievements policies
CREATE POLICY "[ML] View own achievements" ON public.miracle_learning_20260209_user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "[ML] View all likes" ON public.miracle_learning_20260209_likes FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Create own likes" ON public.miracle_learning_20260209_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Delete own likes" ON public.miracle_learning_20260209_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "[ML] View comments" ON public.miracle_learning_20260209_comments FOR SELECT USING (is_deleted = FALSE OR auth.uid() = user_id);
CREATE POLICY "[ML] Create comments" ON public.miracle_learning_20260209_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own comments" ON public.miracle_learning_20260209_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins manage comments" ON public.miracle_learning_20260209_comments FOR ALL USING (public.ml_is_admin());

-- Workshop submissions policies
CREATE POLICY "[ML] View submissions" ON public.miracle_learning_20260209_workshop_submissions FOR SELECT USING (status IN ('approved', 'featured') OR auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create submissions" ON public.miracle_learning_20260209_workshop_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update pending submissions" ON public.miracle_learning_20260209_workshop_submissions FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "[ML] Admins manage submissions" ON public.miracle_learning_20260209_workshop_submissions FOR ALL USING (public.ml_is_admin());

-- Instructor applications policies
CREATE POLICY "[ML] View own applications" ON public.miracle_learning_20260209_instructor_applications FOR SELECT USING (auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create applications" ON public.miracle_learning_20260209_instructor_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update pending applications" ON public.miracle_learning_20260209_instructor_applications FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "[ML] Admins manage applications" ON public.miracle_learning_20260209_instructor_applications FOR ALL USING (public.ml_is_admin());

-- Workshop materials policies
CREATE POLICY "[ML] View materials" ON public.miracle_learning_20260209_workshop_materials FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Admins manage materials" ON public.miracle_learning_20260209_workshop_materials FOR ALL USING (public.ml_is_admin());

-- User material progress policies
CREATE POLICY "[ML] View own material progress" ON public.miracle_learning_20260209_user_material_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] Create own material progress" ON public.miracle_learning_20260209_user_material_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workshop feedback policies
CREATE POLICY "[ML] View own feedback" ON public.miracle_learning_20260209_workshop_feedback FOR SELECT USING (auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create feedback" ON public.miracle_learning_20260209_workshop_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Course reviews policies
CREATE POLICY "[ML] View reviews" ON public.miracle_learning_20260209_course_reviews FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Create reviews" ON public.miracle_learning_20260209_course_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own reviews" ON public.miracle_learning_20260209_course_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins manage reviews" ON public.miracle_learning_20260209_course_reviews FOR ALL USING (public.ml_is_admin());

-- Course notes policies
CREATE POLICY "[ML] View public/own notes" ON public.miracle_learning_20260209_course_notes FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "[ML] Create notes" ON public.miracle_learning_20260209_course_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own notes" ON public.miracle_learning_20260209_course_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Delete own notes" ON public.miracle_learning_20260209_course_notes FOR DELETE USING (auth.uid() = user_id);

-- Note bookmarks policies
CREATE POLICY "[ML] Manage own bookmarks" ON public.miracle_learning_20260209_note_bookmarks FOR ALL USING (auth.uid() = user_id);

-- QA questions policies
CREATE POLICY "[ML] View questions" ON public.miracle_learning_20260209_qa_questions FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Create questions" ON public.miracle_learning_20260209_qa_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own questions" ON public.miracle_learning_20260209_qa_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins manage qa questions" ON public.miracle_learning_20260209_qa_questions FOR ALL USING (public.ml_is_admin());

-- QA answers policies
CREATE POLICY "[ML] View answers" ON public.miracle_learning_20260209_qa_answers FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Create answers" ON public.miracle_learning_20260209_qa_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own answers" ON public.miracle_learning_20260209_qa_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins manage qa answers" ON public.miracle_learning_20260209_qa_answers FOR ALL USING (public.ml_is_admin());

-- Course milestones policies
CREATE POLICY "[ML] View own milestones" ON public.miracle_learning_20260209_course_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "[ML] Insert milestones" ON public.miracle_learning_20260209_course_milestones FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
CREATE POLICY "[ML] Admins manage milestones" ON public.miracle_learning_20260209_course_milestones FOR ALL USING (public.ml_is_admin());

-- Tool categories policies
CREATE POLICY "[ML] View active categories" ON public.miracle_learning_20260209_tool_categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "[ML] Admins manage categories" ON public.miracle_learning_20260209_tool_categories FOR ALL USING (public.ml_is_admin());

-- AI tools policies
CREATE POLICY "[ML] View active tools" ON public.miracle_learning_20260209_ai_tools FOR SELECT USING (is_active = TRUE);
CREATE POLICY "[ML] Admins manage tools" ON public.miracle_learning_20260209_ai_tools FOR ALL USING (public.ml_is_admin());

-- Tool ratings policies
CREATE POLICY "[ML] View ratings" ON public.miracle_learning_20260209_tool_ratings FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Manage own ratings" ON public.miracle_learning_20260209_tool_ratings FOR ALL USING (auth.uid() = user_id);

-- Tool experiences policies
CREATE POLICY "[ML] View approved experiences" ON public.miracle_learning_20260209_tool_experiences FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create experiences" ON public.miracle_learning_20260209_tool_experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update own experiences" ON public.miracle_learning_20260209_tool_experiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Delete own experiences" ON public.miracle_learning_20260209_tool_experiences FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins manage experiences" ON public.miracle_learning_20260209_tool_experiences FOR ALL USING (public.ml_is_admin());

-- Tool cases policies
CREATE POLICY "[ML] View approved cases" ON public.miracle_learning_20260209_tool_cases FOR SELECT USING (status IN ('approved', 'featured') OR auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create cases" ON public.miracle_learning_20260209_tool_cases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update pending cases" ON public.miracle_learning_20260209_tool_cases FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "[ML] Admins manage cases" ON public.miracle_learning_20260209_tool_cases FOR ALL USING (public.ml_is_admin());

-- Tool comparisons policies
CREATE POLICY "[ML] View approved comparisons" ON public.miracle_learning_20260209_tool_comparisons FOR SELECT USING (status IN ('approved', 'featured') OR auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create comparisons" ON public.miracle_learning_20260209_tool_comparisons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update pending comparisons" ON public.miracle_learning_20260209_tool_comparisons FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "[ML] Admins manage comparisons" ON public.miracle_learning_20260209_tool_comparisons FOR ALL USING (public.ml_is_admin());

-- User bookmarks policies
CREATE POLICY "[ML] Manage own bookmarks" ON public.miracle_learning_20260209_user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Weekly picks policies
CREATE POLICY "[ML] View weekly picks" ON public.miracle_learning_20260209_weekly_picks FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Admins manage picks" ON public.miracle_learning_20260209_weekly_picks FOR ALL USING (public.ml_is_admin());

-- Discussions policies
CREATE POLICY "[ML] View active discussions" ON public.miracle_learning_20260209_discussions FOR SELECT USING (status = 'active' OR auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create discussions" ON public.miracle_learning_20260209_discussions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Update discussions" ON public.miracle_learning_20260209_discussions FOR UPDATE USING (auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Authors delete discussions" ON public.miracle_learning_20260209_discussions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "[ML] Admins delete discussions" ON public.miracle_learning_20260209_discussions FOR DELETE USING (public.ml_is_admin());

-- Discussion participants policies
CREATE POLICY "[ML] View participants" ON public.miracle_learning_20260209_discussion_participants FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Add self as participant" ON public.miracle_learning_20260209_discussion_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User invitations policies
CREATE POLICY "[ML] View own invitations" ON public.miracle_learning_20260209_user_invitations FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create invitations" ON public.miracle_learning_20260209_user_invitations FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "[ML] Update invitations" ON public.miracle_learning_20260209_user_invitations FOR UPDATE USING (public.ml_is_admin() OR auth.uid() = inviter_id);

-- Reward items policies
CREATE POLICY "[ML] View active items" ON public.miracle_learning_20260209_reward_items FOR SELECT USING (is_active = TRUE OR public.ml_is_admin());
CREATE POLICY "[ML] Admins manage items" ON public.miracle_learning_20260209_reward_items FOR ALL USING (public.ml_is_admin());

-- Reward orders policies
CREATE POLICY "[ML] View own orders" ON public.miracle_learning_20260209_reward_orders FOR SELECT USING (auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Create own orders" ON public.miracle_learning_20260209_reward_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "[ML] Admins manage orders" ON public.miracle_learning_20260209_reward_orders FOR ALL USING (public.ml_is_admin());

-- Certificates policies
CREATE POLICY "[ML] View own certificates" ON public.miracle_learning_20260209_certificates FOR SELECT USING (auth.uid() = user_id OR public.ml_is_admin());
CREATE POLICY "[ML] Admins manage certificates" ON public.miracle_learning_20260209_certificates FOR ALL USING (public.ml_is_admin());

-- Articles policies
CREATE POLICY "[ML] View published articles" ON public.miracle_learning_20260209_articles FOR SELECT USING (is_published = TRUE OR public.ml_is_admin());
CREATE POLICY "[ML] Admins insert articles" ON public.miracle_learning_20260209_articles FOR INSERT WITH CHECK (public.ml_is_admin());
CREATE POLICY "[ML] Admins update articles" ON public.miracle_learning_20260209_articles FOR UPDATE USING (public.ml_is_admin());
CREATE POLICY "[ML] Admins delete articles" ON public.miracle_learning_20260209_articles FOR DELETE USING (public.ml_is_admin());

-- Article reads policies
CREATE POLICY "[ML] View own reads" ON public.miracle_learning_20260209_article_reads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "[ML] Create own reads" ON public.miracle_learning_20260209_article_reads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "[ML] Update own reads" ON public.miracle_learning_20260209_article_reads FOR UPDATE USING (user_id = auth.uid());

-- Easter eggs policies
CREATE POLICY "[ML] View easter eggs" ON public.miracle_learning_20260209_course_easter_eggs FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Admins manage easter eggs" ON public.miracle_learning_20260209_course_easter_eggs FOR ALL USING (public.ml_is_admin());

-- Easter egg finds policies
CREATE POLICY "[ML] View own finds" ON public.miracle_learning_20260209_user_easter_egg_finds FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "[ML] Create own finds" ON public.miracle_learning_20260209_user_easter_egg_finds FOR INSERT WITH CHECK (user_id = auth.uid());

-- Study groups policies
CREATE POLICY "[ML] View study groups" ON public.miracle_learning_20260209_study_groups FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Create study groups" ON public.miracle_learning_20260209_study_groups FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "[ML] Update own groups" ON public.miracle_learning_20260209_study_groups FOR UPDATE USING (creator_id = auth.uid() OR public.ml_is_admin());
CREATE POLICY "[ML] Delete own groups" ON public.miracle_learning_20260209_study_groups FOR DELETE USING (creator_id = auth.uid() OR public.ml_is_admin());

-- Study group members policies
CREATE POLICY "[ML] View group members" ON public.miracle_learning_20260209_study_group_members FOR SELECT USING (TRUE);
CREATE POLICY "[ML] Join groups" ON public.miracle_learning_20260209_study_group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "[ML] Leave groups" ON public.miracle_learning_20260209_study_group_members FOR DELETE USING (user_id = auth.uid() OR public.ml_is_admin());

-- =============================================================
-- SECTION 15: GRANTS
-- =============================================================

-- Function execution grants
GRANT EXECUTE ON FUNCTION public.ml_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_is_current_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_add_user_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_update_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_refresh_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_mark_lesson_complete(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_upsert_lesson_time_spent(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_accept_answer(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_check_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_generate_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_increment_discussion_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_user_course_progress(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_submit_course_review(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_submit_question_with_bounty(UUID, UUID, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_submit_answer(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_today_points_sum(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_workshop_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_course_completion_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_user_portfolio_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ml_get_weekly_top_gainers() TO authenticated;

-- Table grants for authenticated users
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_users TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_workshops TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_workshops TO anon;
GRANT INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_workshops TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.miracle_learning_20260209_workshop_checkins TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_workshop_checkins TO anon;
GRANT SELECT ON public.miracle_learning_20260209_courses TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_courses TO anon;
GRANT INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_courses TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_chapters TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_chapters TO anon;
GRANT INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_chapters TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_lessons TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_lessons TO anon;
GRANT INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_lessons TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_questions TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_questions TO anon;
GRANT INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_questions TO authenticated;
GRANT SELECT, INSERT ON public.miracle_learning_20260209_user_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_user_lesson_progress TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_point_rules TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_point_rules TO anon;
GRANT SELECT ON public.miracle_learning_20260209_user_point_balance TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_user_point_balance TO anon;
-- Writes to point_balance, point_transactions, user_streaks, user_badges
-- are handled exclusively by SECURITY DEFINER functions (ml_add_user_points, etc.)
GRANT SELECT ON public.miracle_learning_20260209_point_transactions TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_user_streaks TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_user_streaks TO anon;
GRANT SELECT ON public.miracle_learning_20260209_badges TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_badges TO anon;
GRANT SELECT ON public.miracle_learning_20260209_user_badges TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_user_badges TO anon;
GRANT SELECT ON public.ml_leaderboard_view TO authenticated;
GRANT SELECT ON public.ml_leaderboard_view TO anon;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_discussions TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_discussions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_user_invitations TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_tool_categories TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_tool_categories TO anon;
GRANT SELECT ON public.miracle_learning_20260209_ai_tools TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_ai_tools TO anon;
GRANT SELECT, INSERT ON public.miracle_learning_20260209_tool_experiences TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_tool_experiences TO anon;
GRANT SELECT ON public.miracle_learning_20260209_course_milestones TO authenticated;
GRANT INSERT ON public.miracle_learning_20260209_course_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_workshop_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_instructor_applications TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_workshop_materials TO authenticated;
GRANT SELECT, INSERT ON public.miracle_learning_20260209_user_material_progress TO authenticated;
GRANT SELECT, INSERT ON public.miracle_learning_20260209_workshop_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_course_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_course_notes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.miracle_learning_20260209_note_bookmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_qa_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_qa_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_tool_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_tool_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_tool_comparisons TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.miracle_learning_20260209_user_bookmarks TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_weekly_picks TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_discussion_participants TO authenticated;
GRANT INSERT ON public.miracle_learning_20260209_discussion_participants TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_reward_items TO authenticated;
GRANT SELECT, INSERT ON public.miracle_learning_20260209_reward_orders TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_certificates TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_articles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.miracle_learning_20260209_article_reads TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_course_easter_eggs TO authenticated;
GRANT SELECT, INSERT ON public.miracle_learning_20260209_user_easter_egg_finds TO authenticated;
GRANT SELECT ON public.miracle_learning_20260209_study_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.miracle_learning_20260209_study_group_members TO authenticated;
GRANT INSERT ON public.miracle_learning_20260209_study_groups TO authenticated;
GRANT UPDATE, DELETE ON public.miracle_learning_20260209_study_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_articles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miracle_learning_20260209_reward_items TO authenticated;
GRANT SELECT, UPDATE ON public.miracle_learning_20260209_reward_orders TO authenticated;
GRANT SELECT, INSERT ON public.miracle_learning_20260209_certificates TO authenticated;
GRANT DELETE ON public.miracle_learning_20260209_likes TO authenticated;
GRANT DELETE ON public.miracle_learning_20260209_discussions TO authenticated;
GRANT DELETE ON public.miracle_learning_20260209_tool_experiences TO authenticated;

-- Postgres user grants for materialized view refresh
GRANT SELECT ON public.miracle_learning_20260209_users TO postgres;
GRANT SELECT ON public.miracle_learning_20260209_user_point_balance TO postgres;
GRANT SELECT ON public.miracle_learning_20260209_user_streaks TO postgres;
GRANT SELECT ON public.miracle_learning_20260209_user_badges TO postgres;

-- =============================================================
-- SECTION 16: pg_cron (optional, if extension available)
-- =============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ml-refresh-leaderboard');
    PERFORM cron.schedule('ml-refresh-leaderboard', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY ml_leaderboard_view');
    RAISE NOTICE 'pg_cron ml-refresh-leaderboard scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - skipping leaderboard auto-refresh setup';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not setup pg_cron: %', SQLERRM;
END $$;

-- =============================================================
-- END OF MIGRATION
-- =============================================================
