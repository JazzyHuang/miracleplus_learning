import { unstable_cache } from 'next/dist/server/web/spec-extension/unstable-cache';
import { createCacheClient, createClient } from './server';
import type { Course, Workshop } from '@/types/database';
import { sortCourseChaptersAndLessons, sortLessonQuestions } from '@/lib/utils/sort';
import { logger } from '@/lib/logger';
import { DB, RPC } from '@/lib/db-tables';

type CourseWithChapters = Course & {
  chapters: { id: string; order_index: number; lessons: { id: string }[] }[]
};

// 数据库查询返回的课程详情类型（不含课时 content，节省 100-250KB/请求）
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
 * 获取所有已发布课程列表（含章节和课时计数）
 * 使用 unstable_cache 实现服务端缓存
 */
const getCoursesInternal = async (): Promise<CourseWithChapters[]> => {
  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.courses)
    .select(`
      id, title, description, cover_image, order_index, is_published, created_at, updated_at,
      chapters:${DB.chapters} (
        id,
        order_index,
        lessons:${DB.lessons} (id)
      )
    `)
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (error || !data) {
    logger.error('Error fetching courses:', error);
    return [];
  }

  return data as CourseWithChapters[];
};

export async function getCourses(): Promise<CourseWithChapters[]> {
  return unstable_cache(
    getCoursesInternal,
    ['courses'],
    { revalidate: 60, tags: ['courses'] }
  )();
}

/**
 * 获取所有活跃 Workshop 列表
 */
const getWorkshopsInternal = async (): Promise<Workshop[]> => {
  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.workshops)
    .select('id, title, description, cover_image, event_date, is_active, feishu_url, created_at, updated_at')
    .eq('is_active', true)
    .order('event_date', { ascending: false });

  if (error) {
    logger.error('Error fetching workshops:', error);
    return [];
  }

  return (data as Workshop[]) || [];
};

export async function getWorkshops(): Promise<Workshop[]> {
  return unstable_cache(
    getWorkshopsInternal,
    ['workshops'],
    { revalidate: 30, tags: ['workshops'] }
  )();
}

/**
 * 获取单个课程详情（含章节和课时基本信息，不含课时 content）
 * 课时 content 通过 getLessonById 按需加载，避免传输 100-250KB 无用数据
 */
const getCourseByIdInternal = async (courseId: string) => {
  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.courses)
    .select(`
      id, title, description, cover_image, order_index, is_published, created_at,
      chapters:${DB.chapters} (
        id, course_id, title, order_index, created_at,
        lessons:${DB.lessons} (id, chapter_id, title, feishu_url, order_index, created_at)
      )
    `)
    .eq('id', courseId)
    .single();

  if (error) {
    logger.error('Error fetching course:', error);
    return null;
  }

  if (!data) return null;

  return sortCourseChaptersAndLessons(data as CourseDetailFromDB);
};

export async function getCourseById(courseId: string) {
  return unstable_cache(
    () => getCourseByIdInternal(courseId),
    ['courses', `course-${courseId}`],
    { revalidate: 60, tags: ['courses', `course-${courseId}`] }
  )();
}

/**
 * 获取单个 Workshop 详情（含打卡记录）
 */
const getWorkshopByIdInternal = async (workshopId: string) => {
  const supabase = createCacheClient();

  const [workshopResult, checkinsResult] = await Promise.all([
    supabase
      .from(DB.workshops)
      .select('id, title, description, cover_image, event_date, is_active, feishu_url, created_at, updated_at')
      .eq('id', workshopId)
      .single(),
    supabase
      .from(DB.workshop_checkins)
      .select(`id, user_id, workshop_id, image_url, created_at, user:${DB.users}(id, name, avatar_url)`)
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: false }),
  ]);

  if (workshopResult.error) {
    logger.error('Error fetching workshop:', workshopResult.error);
  }
  if (checkinsResult.error) {
    logger.error('Error fetching checkins:', checkinsResult.error);
  }

  return {
    workshop: (workshopResult.data as Workshop | null) ?? null,
    checkins: (checkinsResult.data || []) as unknown as import('@/types/database').WorkshopCheckin[],
  };
};

export async function getWorkshopById(workshopId: string) {
  return unstable_cache(
    () => getWorkshopByIdInternal(workshopId),
    ['workshops', `workshop-${workshopId}`],
    { revalidate: 30, tags: ['workshops', 'checkins', `workshop-${workshopId}`] }
  )();
}

/**
 * 获取课时详情（含测试题）
 */
const getLessonByIdInternal = async (lessonId: string) => {
  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.lessons)
    .select(`
      id, chapter_id, title, content, feishu_url, order_index, created_at,
      questions:${DB.questions} (id, lesson_id, type, question_text, options, correct_answer, explanation, order_index, created_at)
    `)
    .eq('id', lessonId)
    .single();

  if (error) {
    logger.error('Error fetching lesson:', error);
    return null;
  }

  if (!data) return null;

  return sortLessonQuestions(data as LessonDetailFromDB);
};

export async function getLessonById(lessonId: string) {
  return unstable_cache(
    () => getLessonByIdInternal(lessonId),
    ['courses', `lesson-${lessonId}`],
    { revalidate: 60, tags: ['courses', `lesson-${lessonId}`] }
  )();
}

/**
 * Get admin stats — short TTL cache for better UX
 */
const getAdminStatsInternal = async () => {
  const supabase = createCacheClient();

  const results = await Promise.allSettled([
    supabase.from(DB.courses).select('id', { count: 'exact', head: true }),
    supabase.from(DB.workshops).select('id', { count: 'exact', head: true }),
    supabase.from(DB.users).select('id', { count: 'exact', head: true }),
    supabase.from(DB.lessons).select('id', { count: 'exact', head: true }),
  ]);

  return {
    courses: results[0].status === 'fulfilled' ? results[0].value.count || 0 : 0,
    workshops: results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0,
    users: results[2].status === 'fulfilled' ? results[2].value.count || 0 : 0,
    lessons: results[3].status === 'fulfilled' ? results[3].value.count || 0 : 0,
  };
};

export async function getAdminStats() {
  return unstable_cache(
    getAdminStatsInternal,
    ['admin-stats'],
    { revalidate: 5, tags: ['admin-stats'] }
  )();
}

/**
 * Get all courses for admin (including unpublished)
 */
const getAdminCoursesInternal = async (): Promise<Course[]> => {
  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from(DB.courses)
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    logger.error('Error fetching admin courses:', error);
    return [];
  }

  return data || [];
};

export async function getAdminCourses(): Promise<Course[]> {
  return unstable_cache(
    getAdminCoursesInternal,
    ['admin-courses'],
    { revalidate: 5, tags: ['courses', 'admin-courses'] }
  )();
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
 *
 * 性能优化：使用 ml_get_user_dashboard_stats RPC 将 7 个并行查询合并为 1 个数据库调用
 * 注意：此 RPC 需要 authenticated 角色，必须使用带 cookie 的 server client
 */
const DEFAULT_STATS: UserLearningStats = {
  learningDays: 0,
  completedLessons: 0,
  quizAccuracy: 0,
  workshopCheckins: 0,
  totalLessons: 0,
  totalWorkshops: 0,
};

export async function getUserLearningStats(userId: string): Promise<UserLearningStats> {
  try {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)(RPC.get_user_dashboard_stats, {
      p_user_id: userId,
    });

    if (error || !data) {
      logger.error('获取用户学习统计失败 (RPC)', error ? new Error(String(error.message)) : undefined, {
        code: error?.code,
        hint: error?.hint,
      });
      return DEFAULT_STATS;
    }

    const stats = data as {
      learning_days: number;
      completed_lessons: number;
      quiz_total: number;
      quiz_correct: number;
      workshop_checkins: number;
      total_lessons: number;
      total_workshops: number;
    };

    return {
      learningDays: stats.learning_days,
      completedLessons: stats.completed_lessons,
      quizAccuracy: stats.quiz_total > 0
        ? Math.round((stats.quiz_correct / stats.quiz_total) * 100)
        : 0,
      workshopCheckins: stats.workshop_checkins,
      totalLessons: stats.total_lessons,
      totalWorkshops: stats.total_workshops,
    };
  } catch (error) {
    logger.error('获取用户学习统计失败:', error);
    return DEFAULT_STATS;
  }
}

/**
 * 缓存版用户学习统计
 * 性能优化：Dashboard 重复访问时从缓存读取，避免每次都调用 RPC
 * 缓存 60 秒，通过 revalidateTag('user-stats') 在积分变更时失效
 */
export function getCachedUserLearningStats(userId: string): Promise<UserLearningStats> {
  return unstable_cache(
    () => getUserLearningStats(userId),
    ['user-stats', `user-stats-${userId}`],
    { revalidate: 60, tags: ['user-stats'] }
  )();
}

/**
 * 排行榜缓存查询
 * 物化视图数据每 15 分钟刷新，服务端缓存 60 秒避免重复查询
 */
export async function getCachedLeaderboard(limit: number = 50) {
  const { createPointsService } = await import('@/lib/points');
  return unstable_cache(
    async () => {
      const supabase = createCacheClient();
      const pointsService = createPointsService(supabase);
      return pointsService.getLeaderboard(limit);
    },
    ['leaderboard', `leaderboard-${limit}`],
    { revalidate: 60, tags: ['leaderboard'] }
  )();
}

/**
 * 缓存版用户排名查询
 * 性能优化：排行榜页面重复访问时从缓存读取
 * 缓存 60 秒，通过 revalidateTag('leaderboard') 失效
 */
export async function getCachedUserRank(userId: string): Promise<number | null> {
  const { createPointsService } = await import('@/lib/points');
  return unstable_cache(
    async () => {
      const supabase = createCacheClient();
      const pointsService = createPointsService(supabase);
      return pointsService.getUserRank(userId);
    },
    ['user-rank', `user-rank-${userId}`],
    { revalidate: 60, tags: ['leaderboard'] }
  )();
}
