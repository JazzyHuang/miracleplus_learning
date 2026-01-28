'use client';

import { Suspense } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { CourseCard } from './course-card';
import { PageHeader, SearchInput } from '@/components/common';
import { useFilter, getAnimationDelay } from '@/hooks/use-filter';
import { EmptyState } from '@/components/ui/empty-state';
import type { Course, Chapter } from '@/types/database';

type CourseWithChapters = Course & { chapters: Chapter[] };

interface CourseListProps {
  courses: CourseWithChapters[];
  searchQuery?: string;
}

export function CourseList({ courses, searchQuery = '' }: CourseListProps) {
  // 使用通用过滤 Hook
  const filteredCourses = useFilter(courses, searchQuery, ['title', 'description']);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header - 使用通用 PageHeader */}
      <PageHeader
        icon={BookOpen}
        title="线上资源"
        description="系统学习创业知识"
      />

      {/* Search - 使用通用 SearchInput */}
      <div className="mb-6">
        <Suspense fallback={<div className="h-12 bg-muted rounded-lg animate-pulse max-w-md" />}>
          <SearchInput placeholder="搜索课程..." />
        </Suspense>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={searchQuery ? '没有找到匹配的课程' : '暂无课程'}
          description={searchQuery ? '尝试使用其他关键词搜索' : '课程正在准备中'}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <div 
              key={course.id} 
              className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: getAnimationDelay(index) }}
            >
              {/* 前3个课程设置 priority=true 以优化 LCP */}
              <CourseCard course={course} priority={index < 3} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
