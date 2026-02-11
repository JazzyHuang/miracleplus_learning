import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCourseById } from '@/lib/supabase/queries';
import { CourseDetail } from '@/components/course';
import { CourseJsonLd } from '@/components/seo';
import { Skeleton } from '@/components/ui/skeleton';
import type { CourseWithChapters } from '@/types/database';

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

// 缓存策略由 getCourseById 内的 'use cache' + cacheLife('courses') 控制

/**
 * 动态生成课程页面的 Metadata
 */
export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getCourseById(courseId) as CourseWithChapters | null;

  if (!course) {
    return {
      title: '课程不存在 | Miracle Learning',
    };
  }

  const title = `${course.title} | Miracle Learning`;
  const description = course.description || `学习 ${course.title} - 奇绩创坛学习平台`;

  return {
    title,
    description,
    openGraph: {
      title: course.title,
      description,
      type: 'article',
      url: `${BASE_URL}/courses/${courseId}`,
      images: course.cover_image ? [
        {
          url: course.cover_image,
          width: 1200,
          height: 630,
          alt: course.title,
        },
      ] : undefined,
      siteName: 'Miracle Learning',
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description,
      images: course.cover_image ? [course.cover_image] : undefined,
    },
    alternates: {
      canonical: `${BASE_URL}/courses/${courseId}`,
    },
  };
}

/**
 * 课程详情页 — Suspense 流式渲染
 * 页面结构立即显示骨架，数据通过 Suspense 流式加载
 */
export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = await params;

  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CourseData courseId={courseId} />
    </Suspense>
  );
}

async function CourseData({ courseId }: { courseId: string }) {
  const course = await getCourseById(courseId) as CourseWithChapters | null;

  if (!course) {
    notFound();
  }

  return (
    <>
      <CourseJsonLd course={course} baseUrl={BASE_URL} />
      <CourseDetail course={course} courseId={courseId} />
    </>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <Skeleton className="h-9 w-24 rounded-lg" />
      {/* 封面图 */}
      <Skeleton className="h-48 w-full rounded-xl" />
      {/* 标题 + 描述 */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {/* 章节列表 */}
      <div className="space-y-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-2 pl-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
