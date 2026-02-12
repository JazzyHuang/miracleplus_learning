'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { DB } from '@/lib/db-tables';
import { cn } from '@/lib/utils';

interface RecommendedCourse {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  lessonCount: number;
  completedCount: number;
}

export function RecommendedCourses({ userId }: { userId: string }) {
  const { data: courses } = useCachedQuery<RecommendedCourse[]>(
    `recommended-courses-${userId}`,
    async () => {
      const supabase = createClient();

      // Fetch all published courses with lesson counts
      const { data: allCourses } = await supabase
        .from(DB.courses as 'miracle_learning_20260209_courses')
        .select(`id, title, description, cover_image, chapters:${DB.chapters}(lessons:${DB.lessons}(id))`)
        .eq('is_published', true)
        .order('order_index');

      if (!allCourses?.length) return [];

      // Fetch user's completed lessons
      const { data: progress } = await supabase
        .from(DB.user_lesson_progress as 'miracle_learning_20260209_user_lesson_progress')
        .select('lesson_id, course_id')
        .eq('user_id', userId)
        .not('marked_complete_at', 'is', null);

      const completedByCourseFn = (courseId: string) =>
        (progress ?? []).filter((p: { course_id: string }) => p.course_id === courseId).length;

      return (allCourses as unknown as Array<{
        id: string; title: string; description: string | null; cover_image: string | null;
        chapters: Array<{ lessons: Array<{ id: string }> }>;
      }>)
        .map(c => {
          const lessonCount = c.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length ?? 0), 0) ?? 0;
          const completedCount = completedByCourseFn(c.id);
          return { id: c.id, title: c.title, description: c.description, cover_image: c.cover_image, lessonCount, completedCount };
        })
        .filter(c => c.lessonCount > 0 && c.completedCount < c.lessonCount)
        .sort((a, b) => {
          const aStarted = a.completedCount > 0 ? 1 : 0;
          const bStarted = b.completedCount > 0 ? 1 : 0;
          return bStarted - aStarted || a.lessonCount - b.lessonCount;
        })
        .slice(0, 3);
    },
    { ttl: 60000 }
  );

  if (!courses || courses.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-card-foreground flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        为你推荐
      </h3>
      <div className="grid gap-3">
        {courses.map((course) => {
          const pct = course.lessonCount > 0 ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
          return (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <div className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:shadow-theme-sm hover:translate-y-[-1px] transition-all duration-200">
                {course.cover_image ? (
                  <Image
                    src={course.cover_image}
                    alt={course.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {pct > 0 ? `已完成 ${pct}%` : `${course.lessonCount} 课时`}
                  </p>
                </div>
                <ArrowRight className={cn(
                  'w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all',
                )} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
