import type { Course } from '@/types/database';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

interface CourseJsonLdProps {
  course: Course;
  baseUrl?: string;
}

/** 安全序列化 JSON-LD，转义 HTML 特殊字符防止 XSS */
function safeJsonLdStringify(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * 课程结构化数据组件
 * 使用 Schema.org Course 格式
 * 
 * Phase 6 改进：
 * 1. image 字段使用数组格式（Schema.org 推荐）
 * 2. 添加 @id 用于唯一标识
 * 3. 添加 educationalLevel
 * 4. 确保日期格式为 ISO 8601
 */
export function CourseJsonLd({ course, baseUrl = BASE_URL }: CourseJsonLdProps) {
  const courseUrl = `${baseUrl}/courses/${course.id}`;
  const imageUrl = course.cover_image || `${baseUrl}/og-default.png`;
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': courseUrl,
    name: course.title,
    description: course.description || `${course.title} - 奇绩创坛学习平台课程`,
    provider: {
      '@type': 'Organization',
      name: '奇绩创坛',
      sameAs: 'https://miracleplus.com',
      url: 'https://miracleplus.com',
    },
    url: courseUrl,
    // Phase 6 修复：image 应为数组格式
    image: [imageUrl],
    dateCreated: course.created_at,
    datePublished: course.created_at,
    inLanguage: 'zh-CN',
    isAccessibleForFree: true,
    educationalLevel: 'Beginner', // 平台课程面向初创者，默认入门级
    audience: {
      '@type': 'Audience',
      audienceType: '创业者',
    },
    // 添加课程类型
    courseMode: 'online',
    teaches: '创业知识',
  };

  return (
    <script
      id={`course-jsonld-${course.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}
