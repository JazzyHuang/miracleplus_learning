import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCourseById, getLessonById } from '@/lib/supabase/queries';
import { getAuthUser } from '@/lib/supabase/auth';
import { LessonContent, LessonNotFound } from '@/components/course';
import { Skeleton } from '@/components/ui/skeleton';
import type { CourseWithChapters, LessonWithQuestions } from '@/types/database';

interface LessonPageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

/**
 * 课程页面 — Suspense 流式渲染
 * 骨架屏立即显示，数据通过 Suspense 流式加载
 */
export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params;

  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LessonData courseId={courseId} lessonId={lessonId} />
    </Suspense>
  );
}

async function LessonData({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  // Fetch in parallel — getAuthUser is deduplicated via React cache()
  const [course, lesson, sessionUser] = await Promise.all([
    getCourseById(courseId),
    getLessonById(lessonId),
    getAuthUser(),
  ]);

  if (!course || !lesson) {
    return <LessonNotFound courseId={courseId} />;
  }

  // If lesson has feishu_url, redirect to it
  if (lesson.feishu_url) {
    redirect(lesson.feishu_url);
  }

  return (
    <LessonContent
      course={course as CourseWithChapters}
      lesson={lesson as LessonWithQuestions}
      courseId={courseId}
      lessonId={lessonId}
      userId={sessionUser?.id}
    />
  );
}

function LessonSkeleton() {
  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* 标题 */}
      <Skeleton className="h-8 w-2/3" />
      {/* 内容区 */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {/* 底部导航 */}
      <div className="flex justify-between pt-6 border-t border-border/50">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}
