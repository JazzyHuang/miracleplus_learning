-- 048: 全文搜索支持
-- Phase 3.3

-- 1. 为 courses 添加 search_vector
ALTER TABLE public.miracle_learning_20260209_courses
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE public.miracle_learning_20260209_courses
SET search_vector = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS ml_idx_courses_search
  ON public.miracle_learning_20260209_courses USING GIN (search_vector);

-- 自动更新触发器
CREATE OR REPLACE FUNCTION public.ml_courses_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ml_courses_search_update ON public.miracle_learning_20260209_courses;
CREATE TRIGGER ml_courses_search_update
  BEFORE INSERT OR UPDATE OF title, description
  ON public.miracle_learning_20260209_courses
  FOR EACH ROW EXECUTE FUNCTION public.ml_courses_search_vector_update();

-- 2. 为 lessons 添加 search_vector
ALTER TABLE public.miracle_learning_20260209_lessons
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE public.miracle_learning_20260209_lessons
SET search_vector = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS ml_idx_lessons_search
  ON public.miracle_learning_20260209_lessons USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.ml_lessons_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ml_lessons_search_update ON public.miracle_learning_20260209_lessons;
CREATE TRIGGER ml_lessons_search_update
  BEFORE INSERT OR UPDATE OF title, content
  ON public.miracle_learning_20260209_lessons
  FOR EACH ROW EXECUTE FUNCTION public.ml_lessons_search_vector_update();

-- 3. 为 discussions 添加 search_vector
ALTER TABLE public.miracle_learning_20260209_discussions
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE public.miracle_learning_20260209_discussions
SET search_vector = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS ml_idx_discussions_search
  ON public.miracle_learning_20260209_discussions USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.ml_discussions_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ml_discussions_search_update ON public.miracle_learning_20260209_discussions;
CREATE TRIGGER ml_discussions_search_update
  BEFORE INSERT OR UPDATE OF title, content
  ON public.miracle_learning_20260209_discussions
  FOR EACH ROW EXECUTE FUNCTION public.ml_discussions_search_vector_update();

-- 4. 为 ai_tools 添加 search_vector
ALTER TABLE public.miracle_learning_20260209_ai_tools
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE public.miracle_learning_20260209_ai_tools
SET search_vector = to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS ml_idx_ai_tools_search
  ON public.miracle_learning_20260209_ai_tools USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.ml_ai_tools_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(array_to_string(NEW.tags, ' '), ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ml_ai_tools_search_update ON public.miracle_learning_20260209_ai_tools;
CREATE TRIGGER ml_ai_tools_search_update
  BEFORE INSERT OR UPDATE OF name, description, tags
  ON public.miracle_learning_20260209_ai_tools
  FOR EACH ROW EXECUTE FUNCTION public.ml_ai_tools_search_vector_update();

-- 5. 统一搜索 RPC
DROP FUNCTION IF EXISTS public.ml_search_content(text, text[], int);
CREATE OR REPLACE FUNCTION public.ml_search_content(
  p_query text,
  p_types text[] DEFAULT ARRAY['course','lesson','discussion','ai_tool'],
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  result_type text,
  result_id uuid,
  title text,
  snippet text,
  url text,
  rank real
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  tsquery_val tsquery;
BEGIN
  -- 将搜索词转为 tsquery（simple 分词器，每个字符独立匹配）
  tsquery_val := plainto_tsquery('simple', p_query);

  RETURN QUERY
  (
    -- 课程
    SELECT
      'course'::text AS result_type,
      c.id AS result_id,
      c.title,
      left(c.description, 120) AS snippet,
      '/courses/' || c.id::text AS url,
      ts_rank(c.search_vector, tsquery_val) AS rank
    FROM public.miracle_learning_20260209_courses c
    WHERE 'course' = ANY(p_types)
      AND c.is_published = true
      AND c.search_vector @@ tsquery_val

    UNION ALL

    -- 课时
    SELECT
      'lesson'::text,
      l.id,
      l.title,
      left(l.content, 120),
      '/courses/' || ch.course_id::text || '/' || l.id::text,
      ts_rank(l.search_vector, tsquery_val)
    FROM public.miracle_learning_20260209_lessons l
    JOIN public.miracle_learning_20260209_chapters ch ON ch.id = l.chapter_id
    JOIN public.miracle_learning_20260209_courses co ON co.id = ch.course_id
    WHERE 'lesson' = ANY(p_types)
      AND co.is_published = true
      AND l.search_vector @@ tsquery_val

    UNION ALL

    -- 讨论
    SELECT
      'discussion'::text,
      d.id,
      d.title,
      left(d.content, 120),
      '/discussions/' || d.id::text,
      ts_rank(d.search_vector, tsquery_val)
    FROM public.miracle_learning_20260209_discussions d
    WHERE 'discussion' = ANY(p_types)
      AND d.status = 'active'
      AND d.search_vector @@ tsquery_val

    UNION ALL

    -- AI 工具
    SELECT
      'ai_tool'::text,
      t.id,
      t.name,
      left(t.description, 120),
      '/ai-tools/' || t.slug,
      ts_rank(t.search_vector, tsquery_val)
    FROM public.miracle_learning_20260209_ai_tools t
    WHERE 'ai_tool' = ANY(p_types)
      AND t.search_vector @@ tsquery_val
  )
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION public.ml_search_content(text, text[], int) TO authenticated, anon;
