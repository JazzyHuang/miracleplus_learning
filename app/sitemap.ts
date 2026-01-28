import { MetadataRoute } from 'next';
import { getCourses, getWorkshops } from '@/lib/supabase/queries';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

/**
 * 动态生成 sitemap.xml
 * 包含所有公开页面和课程/活动页面
 * 
 * 修复：添加错误处理，防止 getCourses/getWorkshops 失败时崩溃
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
  ];

  try {
    // 获取所有已发布的课程和活动，使用 Promise.allSettled 确保部分失败不影响整体
    const [coursesResult, workshopsResult] = await Promise.allSettled([
      getCourses(),
      getWorkshops(),
    ]);

    const courses = coursesResult.status === 'fulfilled' ? coursesResult.value : [];
    const workshops = workshopsResult.status === 'fulfilled' ? workshopsResult.value : [];

    // 记录错误但不中断
    if (coursesResult.status === 'rejected') {
      console.error('Sitemap: 获取课程失败', coursesResult.reason);
    }
    if (workshopsResult.status === 'rejected') {
      console.error('Sitemap: 获取活动失败', workshopsResult.reason);
    }

    // 课程页面
    const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
      url: `${BASE_URL}/courses/${course.id}`,
      // 优先使用 updated_at（如果存在），否则使用 created_at
      lastModified: new Date(course.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Workshop 页面
    const workshopPages: MetadataRoute.Sitemap = workshops.map((workshop) => ({
      url: `${BASE_URL}/workshop/${workshop.id}`,
      lastModified: new Date(workshop.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...coursePages, ...workshopPages];
  } catch (error) {
    // 如果发生意外错误，返回静态页面作为后备
    console.error('Sitemap: 生成失败', error);
    return staticPages;
  }
}
