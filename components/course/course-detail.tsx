'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  ArrowLeft,
  FileText,
  ChevronRight,
  GraduationCap,
  ExternalLink,
  Play,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { sanitizeUrl } from '@/lib/utils/url';
import type { CourseWithChapters } from '@/types/database';

interface CourseDetailProps {
  course: CourseWithChapters | null;
  courseId: string;
}

/**
 * Course Detail — 白色内容卡片 + 浅色嵌套
 */
export function CourseDetail({ course, courseId }: CourseDetailProps) {
  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-xl bg-card flex items-center justify-center mb-4 border border-border/50 shadow-sm">
          <GraduationCap className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-foreground/60 mb-4">课程不存在</p>
        <Link href="/courses">
          <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
            返回课程列表
          </button>
        </Link>
      </div>
    );
  }

  const totalLessons = course.chapters?.reduce(
    (acc, chapter) => acc + (chapter.lessons?.length || 0),
    0
  ) || 0;

  const firstLesson = course.chapters?.[0]?.lessons?.[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <div className="animate-fade-up">
        <Link href="/courses">
          <button className="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            返回课程列表
          </button>
        </Link>
      </div>

      {/* Course Header Card — 白色卡片 */}
      <div
        className="relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm animate-fade-up"
        style={{ '--animation-delay': '0.1s' } as React.CSSProperties}
      >
        {/* Cover Image */}
        <div className="relative h-48 md:h-56 overflow-hidden">
          {course.cover_image ? (
            <>
              <Image
                src={course.cover_image}
                alt={course.title}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                fetchPriority="high"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="h-full bg-muted flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Course info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-2xl font-medium text-white mb-3 tracking-tight">
              {course.title}
            </h1>
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{course.chapters?.length || 0} 章</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>{totalLessons} 节课程</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>预计 {Math.ceil(totalLessons * 15 / 60)} 小时</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description & CTA */}
        {(course.description || firstLesson) && (
          <div className="p-6 border-t border-border/50">
            {course.description && (
              <p className="text-muted-foreground mb-6">{course.description}</p>
            )}
            {firstLesson && (
              firstLesson.feishu_url ? (
                <a href={sanitizeUrl(firstLesson.feishu_url)} target="_blank" rel="noopener noreferrer">
                  <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm">
                    <Play className="w-4 h-4" />
                    开始学习
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </button>
                </a>
              ) : (
                <Link href={`/courses/${courseId}/${firstLesson.id}`}>
                  <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm">
                    <Play className="w-4 h-4" />
                    开始学习
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              )
            )}
          </div>
        )}
      </div>

      {/* Course Content */}
      <div
        className="animate-fade-up"
        style={{ '--animation-delay': '0.2s' } as React.CSSProperties}
      >
        <h2 className="text-lg font-medium text-foreground mb-4">课程目录</h2>
        <div className="space-y-6">
          {course.chapters?.map((chapter, chapterIndex) => (
            <div
              key={chapter.id}
              className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden animate-fade-up"
              style={{ '--animation-delay': `${200 + chapterIndex * 50}ms` } as React.CSSProperties}
            >
              {/* Chapter Header */}
              <div className="p-4 border-b border-border/50 bg-muted/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-card-foreground">
                    第 {chapterIndex + 1} 章：{chapter.title}
                  </h3>
                  <Badge variant="secondary" size="sm">
                    {chapter.lessons?.length || 0} 节
                  </Badge>
                </div>
              </div>
              
              {/* Lessons */}
              <div className="divide-y divide-border/30">
                {chapter.lessons?.map((lesson, lessonIndex) => {
                  const hasFeishuUrl = !!lesson.feishu_url;
                  
                  const lessonContent = (
                    <div className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                        {chapterIndex + 1}.{lessonIndex + 1}
                      </div>
                      <span className="flex-1 text-card-foreground/70 group-hover:text-card-foreground transition-colors">
                        {lesson.title}
                      </span>
                      {hasFeishuUrl ? (
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  );

                  if (hasFeishuUrl) {
                    return (
                      <a
                        key={lesson.id}
                        href={sanitizeUrl(lesson.feishu_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {lessonContent}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${courseId}/${lesson.id}`}
                    >
                      {lessonContent}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
