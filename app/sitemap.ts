import { MetadataRoute } from 'next';
import { getCourses, getWorkshops } from '@/lib/supabase/queries';
import { createCacheClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { DB } from '@/lib/db-tables';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

/**
 * 动态生成 sitemap.xml
 * 包含所有公开页面和课程/活动页面
 *
 * 修复：添加错误处理，防止 getCourses/getWorkshops 失败时崩溃
 * 添加超时控制，防止构建时挂起
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页面（始终包含）
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/workshop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/discussions`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/ai-tools`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // 添加超时控制，防止构建时挂起
  const timeout = (ms: number) => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Sitemap 生成超时')), ms)
  );

  try {
    // 获取所有已发布的课程和活动，使用 Promise.allSettled 确保部分失败不影响整体
    // 添加 10 秒超时
    const [coursesResult, workshopsResult] = await Promise.allSettled([
      Promise.race([getCourses(), timeout(10000)]) as Promise<ReturnType<typeof getCourses>>,
      Promise.race([getWorkshops(), timeout(10000)]) as Promise<ReturnType<typeof getWorkshops>>,
    ]);

    const courses = coursesResult.status === 'fulfilled' ? coursesResult.value : [];
    const workshops = workshopsResult.status === 'fulfilled' ? workshopsResult.value : [];

    // 记录错误但不中断
    if (coursesResult.status === 'rejected') {
      logger.error('Sitemap: 获取课程失败', coursesResult.reason);
    }
    if (workshopsResult.status === 'rejected') {
      logger.error('Sitemap: 获取活动失败', workshopsResult.reason);
    }

    // 课程页面
    const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
      url: `${BASE_URL}/courses/${course.id}`,
      lastModified: new Date(course.updated_at || course.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Workshop 页面
    const workshopPages: MetadataRoute.Sitemap = workshops.map((workshop) => ({
      url: `${BASE_URL}/workshop/${workshop.id}`,
      lastModified: new Date(workshop.updated_at || workshop.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Discussion pages - 也添加超时控制
    let discussionPages: MetadataRoute.Sitemap = [];
    let toolPages: MetadataRoute.Sitemap = [];
    try {
      const supabase = createCacheClient();
      type DiscussionData = { id: string; created_at: string; updated_at: string | null };
      type ToolData = { slug: string; created_at: string; updated_at: string | null };

      const [discussionsResult, toolsResult] = await Promise.allSettled([
        Promise.race([
          supabase.from(DB.discussions).select('id, created_at, updated_at').eq('status', 'active').order('created_at', { ascending: false }).limit(100),
          timeout(5000)
        ]),
        Promise.race([
          supabase.from(DB.ai_tools).select('slug, created_at, updated_at').order('created_at', { ascending: false }).limit(100),
          timeout(5000)
        ]),
      ]);

      if (discussionsResult.status === 'fulfilled') {
        const data = (discussionsResult.value as { data: DiscussionData[] | null })?.data;
        if (data) {
          discussionPages = data.map((d) => ({
            url: `${BASE_URL}/discussions/${d.id}`,
            lastModified: new Date(d.updated_at || d.created_at),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          }));
        }
      }

      if (toolsResult.status === 'fulfilled') {
        const data = (toolsResult.value as { data: ToolData[] | null })?.data;
        if (data) {
          toolPages = data.map((t) => ({
            url: `${BASE_URL}/ai-tools/${t.slug}`,
            lastModified: new Date(t.updated_at || t.created_at),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          }));
        }
      }
    } catch (e) {
      // 忽略 discussion/tools 获取错误，不影响整体 sitemap
      logger.error('Sitemap: 获取讨论/工具失败（已忽略）', e);
    }

    return [...staticPages, ...coursePages, ...workshopPages, ...discussionPages, ...toolPages];
  } catch (error) {
    // 如果发生意外错误，返回静态页面作为后备
    logger.error('Sitemap: 生成失败，返回静态页面', error);
    return staticPages;
  }
}
