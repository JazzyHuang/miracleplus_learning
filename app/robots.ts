import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

/**
 * 动态生成 robots.txt
 * 
 * Phase 7: 优化搜索引擎爬虫配置
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 通用规则
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/login',
          '/register',
          '/_next/',
          '/private/',
        ],
      },
      // Google 专用规则
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      // Bing 专用规则
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
