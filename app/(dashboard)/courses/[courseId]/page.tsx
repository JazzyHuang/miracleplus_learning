import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCourseById, getCourses } from '@/lib/supabase/queries';
import { CourseDetail } from '@/components/course';
import { CourseJsonLd } from '@/components/seo';
import type { CourseWithChapters } from '@/types/database';

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

// ISR: 每5分钟重新验证
export const revalidate = 300;

/**
 * 静态生成所有课程页面
 */
export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((course) => ({
    courseId: course.id,
  }));
}

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
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = await params;
  
  // Use cached query - data is cached for 5 minutes
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
