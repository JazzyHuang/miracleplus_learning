-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workshops table
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  event_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workshop checkins table
CREATE TABLE IF NOT EXISTS public.workshop_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, workshop_id)
);

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'boolean')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User answers table
CREATE TABLE IF NOT EXISTS public.user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workshop_checkins_user ON public.workshop_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_checkins_workshop ON public.workshop_checkins(workshop_id);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON public.chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson ON public.questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user ON public.user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question ON public.user_answers(question_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for workshops (public read, admin write)
CREATE POLICY "Anyone can view active workshops" ON public.workshops
  FOR SELECT USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage workshops" ON public.workshops
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for workshop_checkins
CREATE POLICY "Users can view all checkins" ON public.workshop_checkins
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own checkins" ON public.workshop_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checkins" ON public.workshop_checkins
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for courses (public read published, admin all)
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (is_published = true OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for chapters
CREATE POLICY "Anyone can view chapters of published courses" ON public.chapters
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.courses WHERE id = course_id AND (is_published = true OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ))
  ));

CREATE POLICY "Admins can manage chapters" ON public.chapters
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for lessons
CREATE POLICY "Anyone can view lessons of published courses" ON public.lessons
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.courses co ON c.course_id = co.id
    WHERE c.id = chapter_id AND (co.is_published = true OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ))
  ));

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for questions
CREATE POLICY "Anyone can view questions of published courses" ON public.questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.chapters c ON l.chapter_id = c.id
    JOIN public.courses co ON c.course_id = co.id
    WHERE l.id = lesson_id AND (co.is_published = true OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ))
  ));

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for user_answers
CREATE POLICY "Users can view their own answers" ON public.user_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own answers" ON public.user_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for images (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);
