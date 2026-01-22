import { getAdminCourses } from '@/lib/supabase/queries';
import { AdminCourseList } from '@/components/admin';

export default async function AdminCoursesPage() {
  // Server-side data fetching - no client-side loading state needed
  const courses = await getAdminCourses();

  return <AdminCourseList initialCourses={courses} />;
}
