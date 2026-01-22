import { unstable_cache } from 'next/cache';
import { createClient, createCacheClient } from './server';
import type { Course, Chapter, Workshop } from '@/types/database';

type CourseWithChapters = Course & { 
  chapters: (Chapter & { lessons: { id: string }[] })[] 
};

/**
 * Cached function to get all published courses with their chapters and lesson counts.
 * Revalidates every 5 minutes or when the 'courses' tag is invalidated.
 */
export const getCourses = unstable_cache(
  async (): Promise<CourseWithChapters[]> => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        chapters (
          id,
          title,
          order_index,
          lessons (id)
        )
      `)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching courses:', error);
      return [];
    }

    return (data as CourseWithChapters[]) || [];
  },
  ['courses-list'],
  { revalidate: 300, tags: ['courses'] }
);

/**
 * Cached function to get all active workshops.
 * Revalidates every 5 minutes or when the 'workshops' tag is invalidated.
 */
export const getWorkshops = unstable_cache(
  async (): Promise<Workshop[]> => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('is_active', true)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error fetching workshops:', error);
      return [];
    }

    return (data as Workshop[]) || [];
  },
  ['workshops-list'],
  { revalidate: 300, tags: ['workshops'] }
);

/**
 * Cached function to get a single course with full details.
 * Each course is cached separately by ID.
 */
export const getCourseById = unstable_cache(
  async (courseId: string) => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        chapters (
          *,
          lessons (*)
        )
      `)
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      return null;
    }

    // Sort chapters and lessons by order_index
    if (data) {
      return {
        ...data,
        chapters: data.chapters
          ?.sort((a: any, b: any) => a.order_index - b.order_index)
          .map((chapter: any) => ({
            ...chapter,
            lessons: chapter.lessons?.sort((a: any, b: any) => a.order_index - b.order_index),
          })),
      };
    }

    return null;
  },
  ['course-detail'],
  { revalidate: 300, tags: ['courses'] }
);

/**
 * Cached function to get a single workshop with checkins.
 */
export const getWorkshopById = unstable_cache(
  async (workshopId: string) => {
    const supabase = createCacheClient();
    
    const [workshopResult, checkinsResult] = await Promise.all([
      supabase
        .from('workshops')
        .select('*')
        .eq('id', workshopId)
        .single(),
      supabase
        .from('workshop_checkins')
        .select('*, user:users(*)')
        .eq('workshop_id', workshopId)
        .order('created_at', { ascending: false }),
    ]);

    return {
      workshop: workshopResult.data as Workshop | null,
      checkins: checkinsResult.data || [],
    };
  },
  ['workshop-detail'],
  { revalidate: 60, tags: ['workshops', 'checkins'] } // Shorter cache for checkins
);

/**
 * Cached function to get lesson with questions.
 */
export const getLessonById = unstable_cache(
  async (lessonId: string) => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        questions (*)
      `)
      .eq('id', lessonId)
      .single();

    if (error) {
      console.error('Error fetching lesson:', error);
      return null;
    }

    if (data) {
      return {
        ...data,
        questions: data.questions?.sort((a: any, b: any) => a.order_index - b.order_index),
      };
    }

    return null;
  },
  ['lesson-detail'],
  { revalidate: 300, tags: ['courses'] }
);

/**
 * Get admin stats - not cached as admins need real-time data
 */
export async function getAdminStats() {
  const supabase = await createClient();

  const [courses, workshops, users, lessons] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('workshops').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('lessons').select('id', { count: 'exact', head: true }),
  ]);

  return {
    courses: courses.count || 0,
    workshops: workshops.count || 0,
    users: users.count || 0,
    lessons: lessons.count || 0,
  };
}

/**
 * Get all courses for admin (including unpublished)
 */
export async function getAdminCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching admin courses:', error);
    return [];
  }

  return data || [];
}
