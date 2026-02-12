'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, FileText, ArrowRight, ImageOff, Play } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { BookmarkButton } from '@/components/common/bookmark-button';
import { ShareButton } from '@/components/common/share-button';
import type { Course, Chapter } from '@/types/database';

interface CourseCardProps {
  course: Course & { chapters?: Chapter[] };
  progress?: number;
  priority?: boolean;
  isBookmarked?: boolean;
}

/**
 * Course Card — 白色卡片 + 柔和阴影 + hover 上浮
 */
function CourseCardComponent({ course, progress, priority = false, isBookmarked = false }: CourseCardProps) {
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
      <div className="group relative h-full rounded-xl bg-card border border-border/50 shadow-theme-sm hover:shadow-theme-md hover:border-primary/15 transition-all duration-300 overflow-hidden cv-auto">
        {/* Cover Image */}
        <div className="relative h-32 md:h-40 overflow-hidden bg-muted rounded-t-xl">
          {course.cover_image && !imageError ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
              <Image
                src={course.cover_image}
                alt={course.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`object-cover group-hover:scale-105 transition-transform duration-500 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                priority={priority}
                loading={priority ? undefined : 'lazy'}
                fetchPriority={priority ? 'high' : undefined}
              />
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {imageError ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageOff className="w-8 h-8" />
                  <span className="text-xs">加载失败</span>
                </div>
              ) : (
                <BookOpen className="w-12 h-12 text-muted-foreground/50" />
              )}
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/90 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>

          {/* Bookmark & Share buttons */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <ShareButton
              title={course.title}
              text={course.description || `学习 ${course.title}`}
              url={`/courses/${course.id}`}
              size="sm"
              className="bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white hover:text-white"
            />
            <BookmarkButton
              targetType="course"
              targetId={course.id}
              initialBookmarked={isBookmarked}
              size="sm"
              className="bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white hover:text-white"
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6">
          <h3 className="font-medium text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          
          {course.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {course.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{course.chapters?.length || 0} 章</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>{totalLessons} 节</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
          </div>

          {/* Progress bar */}
          {typeof progress === 'number' && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">学习进度</span>
                <span className="text-card-foreground font-medium">{progress}%</span>
              </div>
              <Progress value={progress} variant="brand" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// React Compiler (reactCompiler: true) 已自动处理 memoization
// 移除手动 memo + 自定义比较函数，避免与 Compiler 冲突
export { CourseCardComponent as CourseCard };
