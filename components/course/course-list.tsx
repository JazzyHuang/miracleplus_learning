import { Suspense } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { CourseCard } from './course-card';
import { CourseSearch } from './course-search';
import type { Course, Chapter } from '@/types/database';

type CourseWithChapters = Course & { chapters: Chapter[] };

interface CourseListProps {
  courses: CourseWithChapters[];
  searchQuery?: string;
}

export function CourseList({ courses, searchQuery = '' }: CourseListProps) {
  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">线上资源</h1>
            <p className="text-muted-foreground mt-1">系统学习创业知识</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Suspense fallback={<div className="h-12 bg-muted rounded-lg animate-pulse max-w-md" />}>
          <CourseSearch />
        </Suspense>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? '没有找到匹配的课程' : '暂无课程'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <div 
              key={course.id} 
              className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CourseCard course={course} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
