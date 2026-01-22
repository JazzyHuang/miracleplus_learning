import { redirect } from 'next/navigation';
import { getCourseById, getLessonById } from '@/lib/supabase/queries';
import { getSessionUser } from '@/lib/supabase/auth';
import { LessonContent, LessonNotFound } from '@/components/course';
import type { CourseWithChapters, LessonWithQuestions } from '@/types/database';

interface LessonPageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params;
  
  // Use cached queries - fetch in parallel for maximum speed
  // getSessionUser is fast (local JWT parsing) - no network request
  const [course, lesson, sessionUser] = await Promise.all([
    getCourseById(courseId),
    getLessonById(lessonId),
    getSessionUser(),
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
