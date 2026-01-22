import { getCourses } from '@/lib/supabase/queries';
import { CourseList } from '@/components/course';

interface CoursesListPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CoursesListPage({ searchParams }: CoursesListPageProps) {
  const { q: searchQuery } = await searchParams;
  const courses = await getCourses();

  return <CourseList courses={courses} searchQuery={searchQuery} />;
}
