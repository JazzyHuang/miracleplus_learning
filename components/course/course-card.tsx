'use client';

import { useState, memo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, FileText, ArrowRight, ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Course, Chapter } from '@/types/database';

interface CourseCardProps {
  course: Course & { chapters?: Chapter[] };
  /** 课程完成进度（0-100），不传则隐藏进度条 */
  progress?: number;
  /** 是否为首屏课程（优先加载图片） */
  priority?: boolean;
}

/**
 * 课程卡片组件
 * 
 * Phase 1 修复：
 * 1. 进度值通过 props 传入，不再硬编码
 * 2. 添加图片加载状态（骨架屏）和错误处理
 * 3. 添加触摸设备反馈
 * 
 * Phase 5 优化：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 使用 useCallback 优化事件处理函数
 * 3. 添加 priority 属性支持首屏图片优化
 */
function CourseCardComponent({ course, progress, priority = false }: CourseCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const totalLessons = course.chapters?.reduce(
    (acc, chapter) => acc + (chapter.lessons?.length || 0),
    0
  ) || 0;

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="group overflow-hidden border border-border hover:border-foreground/20 shadow-soft hover:shadow-medium transition-all duration-200 h-full rounded-xl hover:-translate-y-0.5 active:scale-[0.98]">
        {/* Cover Image */}
        <div className="relative h-44 overflow-hidden bg-muted rounded-t-xl">
          {course.cover_image && !imageError ? (
            <>
              {imageLoading && (
                <Skeleton className="absolute inset-0 rounded-none" aria-label="图片加载中" />
              )}
              <Image
                src={course.cover_image}
                alt={course.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`object-cover group-hover:scale-[1.02] transition-transform duration-200 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                priority={priority}
                loading={priority ? undefined : 'lazy'}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {imageError ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                  <ImageOff className="w-10 h-10" />
                  <span className="text-xs">图片加载失败</span>
                </div>
              ) : (
                <BookOpen className="w-14 h-14 text-muted-foreground/30" />
              )}
            </div>
          )}
          {/* Progress overlay - 只在有进度值时显示 */}
          {typeof progress === 'number' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
              <div 
                className="h-full bg-foreground transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`课程进度 ${progress}%`}
              />
            </div>
          )}
        </div>

        <CardContent className="p-5">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-foreground transition-colors">
            {course.title}
          </h3>
          
          {course.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {course.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" aria-hidden="true" />
                <span>{course.chapters?.length || 0} 章</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>{totalLessons} 节</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * 计算课程的总课时数
 */
function getTotalLessons(chapters?: Chapter[]): number {
  if (!chapters) return 0;
  return chapters.reduce((acc, chapter) => acc + (chapter.lessons?.length || 0), 0);
}

/**
 * 使用 React.memo 优化，避免父组件重渲染时不必要的子组件更新
 * 自定义比较函数：比较所有可能影响渲染的 props
 * 
 * 重要：除了比较 chapters.length，还需要比较总课时数，
 * 因为组件会显示 totalLessons（章节内课时的总和）
 */
export const CourseCard = memo(CourseCardComponent, (prevProps, nextProps) => {
  const prevCourse = prevProps.course;
  const nextCourse = nextProps.course;
  
  // 比较基本属性
  if (
    prevCourse.id !== nextCourse.id ||
    prevCourse.title !== nextCourse.title ||
    prevCourse.description !== nextCourse.description ||
    prevCourse.cover_image !== nextCourse.cover_image ||
    prevProps.progress !== nextProps.progress ||
    prevProps.priority !== nextProps.priority
  ) {
    return false;
  }
  
  // 比较章节数量
  const prevChaptersLen = prevCourse.chapters?.length ?? 0;
  const nextChaptersLen = nextCourse.chapters?.length ?? 0;
  if (prevChaptersLen !== nextChaptersLen) {
    return false;
  }
  
  // 比较总课时数（防止章节内课时变化但章节数不变的情况）
  const prevTotalLessons = getTotalLessons(prevCourse.chapters);
  const nextTotalLessons = getTotalLessons(nextCourse.chapters);
  if (prevTotalLessons !== nextTotalLessons) {
    return false;
  }
  
  return true;
});
