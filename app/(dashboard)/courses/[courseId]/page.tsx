import { getCourseById } from '@/lib/supabase/queries';
import { CourseDetail } from '@/components/course';
import type { CourseWithChapters } from '@/types/database';

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = await params;
  
  // Use cached query - data is cached for 5 minutes
  const course = await getCourseById(courseId) as CourseWithChapters | null;

  return <CourseDetail course={course} courseId={courseId} />;
}
