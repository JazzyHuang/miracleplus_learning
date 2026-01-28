import { Suspense } from 'react';
import { Metadata } from 'next';
import { getCourses } from '@/lib/supabase/queries';
import { CourseList } from '@/components/course';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Phase 6: 添加页面元数据用于 SEO
 */
export const metadata: Metadata = {
  title: '线上资源 | Miracle Learning',
  description: '系统学习创业知识，观看课程视频，完成章节测试，快速提升创业能力',
  openGraph: {
    title: '线上资源 | Miracle Learning',
    description: '系统学习创业知识，观看课程视频，完成章节测试',
    type: 'website',
  },
};

interface CoursesListPageProps {
  searchParams: Promise<{ q?: string }>;
}

/**
 * 课程列表骨架屏
 */
function CoursesListSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 异步课程列表组件
 */
async function AsyncCourseList({ searchQuery }: { searchQuery?: string }) {
  const courses = await getCourses();
  return <CourseList courses={courses} searchQuery={searchQuery} />;
}

/**
 * P2 优化：使用 Suspense 实现流式渲染
 */
export default async function CoursesListPage({ searchParams }: CoursesListPageProps) {
  const { q: searchQuery } = await searchParams;

  return (
    <Suspense fallback={<CoursesListSkeleton />}>
      <AsyncCourseList searchQuery={searchQuery} />
    </Suspense>
  );
}
