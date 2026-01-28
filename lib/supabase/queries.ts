import { unstable_cache } from 'next/cache';
import { createClient, createCacheClient } from './server';
import type { Course, Chapter, Workshop, Lesson, Question } from '@/types/database';
import { sortCourseChaptersAndLessons, sortLessonQuestions } from '@/lib/utils/sort';

type CourseWithChapters = Course & { 
  chapters: (Chapter & { lessons: { id: string }[] })[] 
};

// 数据库查询返回的课程详情类型
interface CourseDetailFromDB {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  chapters: Array<{
    id: string;
    course_id: string;
    title: string;
    order_index: number;
    created_at: string;
    lessons: Array<{
      id: string;
      chapter_id: string;
      title: string;
      content: string;
      feishu_url: string | null;
      order_index: number;
      created_at: string;
    }>;
  }>;
}

// 数据库查询返回的课时详情类型
interface LessonDetailFromDB {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  feishu_url: string | null;
  order_index: number;
  created_at: string;
  questions: Array<{
    id: string;
    lesson_id: string;
    type: string;
    question_text: string;
    options: Array<{ id: string; text: string }>;
    correct_answer: string | string[];
    explanation?: string;
    order_index: number;
    created_at: string;
  }>;
}

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

    // Sort chapters and lessons by order_index using utility function
    if (data) {
      return sortCourseChaptersAndLessons(data as CourseDetailFromDB);
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
      // Sort questions by order_index using utility function
      return sortLessonQuestions(data as LessonDetailFromDB);
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

/**
 * 用户学习统计数据
 */
export interface UserLearningStats {
  /** 学习天数（首次登录至今） */
  learningDays: number;
  /** 完成的课时数 */
  completedLessons: number;
  /** 测试正确率 */
  quizAccuracy: number;
  /** 活动参与次数 */
  workshopCheckins: number;
  /** 总课时数 */
  totalLessons: number;
  /** 总活动数 */
  totalWorkshops: number;
}

/**
 * 获取用户学习统计数据
 * 用于首页仪表盘展示
 */
export async function getUserLearningStats(userId: string): Promise<UserLearningStats> {
  const supabase = await createClient();

  try {
    // 并行查询所有统计数据
    const [
      userResult,
      progressResult,
      quizResult,
      checkinResult,
      lessonsResult,
      workshopsResult,
    ] = await Promise.all([
      // 获取用户创建时间（计算学习天数）
      supabase
        .from('users')
        .select('created_at')
        .eq('id', userId)
        .single(),
      // 获取用户完成的课时数
      supabase
        .from('user_lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_completed', true),
      // 获取用户的测试答题记录（使用 user_answers 表）
      supabase
        .from('user_answers')
        .select('is_correct')
        .eq('user_id', userId),
      // 获取用户的活动打卡记录
      supabase
        .from('workshop_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 获取总课时数
      supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true }),
      // 获取活跃活动数
      supabase
        .from('workshops')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
    ]);

    // 计算学习天数
    let learningDays = 0;
    if (userResult.data?.created_at) {
      const createdAt = new Date(userResult.data.created_at);
      const now = new Date();
      learningDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // 计算测试正确率
    let quizAccuracy = 0;
    if (quizResult.data && quizResult.data.length > 0) {
      const correctCount = quizResult.data.filter((q) => q.is_correct).length;
      quizAccuracy = Math.round((correctCount / quizResult.data.length) * 100);
    }

    return {
      learningDays,
      completedLessons: progressResult.count || 0,
      quizAccuracy,
      workshopCheckins: checkinResult.count || 0,
      totalLessons: lessonsResult.count || 0,
      totalWorkshops: workshopsResult.count || 0,
    };
  } catch (error) {
    console.error('获取用户学习统计失败:', error);
    return {
      learningDays: 0,
      completedLessons: 0,
      quizAccuracy: 0,
      workshopCheckins: 0,
      totalLessons: 0,
      totalWorkshops: 0,
    };
  }
}

/**
 * 获取用户课程进度
 */
export async function getUserCourseProgress(
  userId: string,
  courseId: string
): Promise<{ completedLessons: number; totalLessons: number; percentage: number }> {
  const supabase = await createClient();

  try {
    // 获取课程所有课时
    const { data: courseData } = await supabase
      .from('courses')
      .select(`
        chapters (
          lessons (id)
        )
      `)
      .eq('id', courseId)
      .single();

    const allLessonIds: string[] = courseData?.chapters?.flatMap(
      (c: { lessons?: { id: string }[] }) => c.lessons?.map((l) => l.id) || []
    ) || [];

    if (allLessonIds.length === 0) {
      return { completedLessons: 0, totalLessons: 0, percentage: 0 };
    }

    // 获取用户完成的课时
    const { count } = await supabase
      .from('user_lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_completed', true)
      .in('lesson_id', allLessonIds);

    const completedLessons = count || 0;
    const totalLessons = allLessonIds.length;
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return { completedLessons, totalLessons, percentage };
  } catch (error) {
    console.error('获取课程进度失败:', error);
    return { completedLessons: 0, totalLessons: 0, percentage: 0 };
  }
}
