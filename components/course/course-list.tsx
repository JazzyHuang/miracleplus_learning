'use client';

import { Suspense } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { CourseCard } from './course-card';
import { PageHeader, SearchInput } from '@/components/common';
import { useFilter } from '@/hooks/use-filter';
import { EmptyState } from '@/components/ui/empty-state';
import type { Course, Chapter } from '@/types/database';

type CourseWithChapters = Course & { chapters: Chapter[] };

interface CourseListProps {
  courses: CourseWithChapters[];
  searchQuery?: string;
}

/**
 * Course List — 白色卡片网格 + CSS 入场动画
 * 
 * 优化：m.div 替换为 CSS animate-fade-up + animation-delay
 * 保留 'use client' — 需要 useFilter hook
 */
export function CourseList({ courses, searchQuery = '' }: CourseListProps) {
  const filteredCourses = useFilter(courses, searchQuery, ['title', 'description']);

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header */}
      <div className="animate-fade-up">
        <PageHeader
          icon={BookOpen}
          title="线上资源"
          description="系统学习创业知识"
        />
      </div>

      {/* Search */}
      <div
        className="animate-fade-up"
        style={{ '--animation-delay': '0.1s' } as React.CSSProperties}
      >
        <Suspense fallback={<div className="h-11 bg-card rounded-xl animate-pulse max-w-md border border-border/50" />}>
          <SearchInput placeholder="搜索课程..." />
        </Suspense>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div
          className="animate-fade-up"
          style={{ '--animation-delay': '0.2s' } as React.CSSProperties}
        >
          <EmptyState
            icon={GraduationCap}
            title={searchQuery ? '没有找到匹配的课程' : '暂无课程'}
            description={searchQuery ? '尝试使用其他关键词搜索' : '课程正在准备中'}
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredCourses.map((course, index) => (
            <div
              key={course.id}
              className="animate-fade-up cv-list-item"
              style={{
                '--animation-delay': `${100 + Math.min(index * 50, 300)}ms`,
              } as React.CSSProperties}
            >
              <CourseCard course={course} priority={index < 3} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
