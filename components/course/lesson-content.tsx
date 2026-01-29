'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Menu,
  X,
  FileText,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import { ChapterNav } from '@/components/course';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CourseWithChapters, LessonWithQuestions } from '@/types/database';

// 动态导入大型组件以优化首屏加载
const MarkdownRenderer = dynamic(
  () => import('@/components/course/markdown-renderer').then((mod) => mod.MarkdownRenderer),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    ),
    ssr: false,
  }
);

const QuizPanel = dynamic(
  () => import('@/components/quiz/quiz-panel').then((mod) => mod.QuizPanel),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    ),
    ssr: false,
  }
);

interface LessonContentProps {
  course: CourseWithChapters;
  lesson: LessonWithQuestions;
  courseId: string;
  lessonId: string;
  userId?: string;
}

export function LessonContent({ course, lesson, courseId, lessonId, userId }: LessonContentProps) {
  const [showNav, setShowNav] = useState(false);
  const [showQuiz, setShowQuiz] = useState(true);

  // Get prev/next lessons
  const allLessons = course?.chapters?.flatMap((c) => c.lessons || []) || [];
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <div className="flex h-[calc(100vh-120px)] lg:h-[calc(100vh-64px)] -m-4 lg:-m-8">
      {/* Mobile Nav Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-20 left-4 z-50 bg-background shadow-md"
        onClick={() => setShowNav(!showNav)}
      >
        {showNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Left Navigation - Desktop always visible */}
      <aside
        className={cn(
          'w-72 bg-card border-r shrink-0 overflow-hidden',
          'fixed lg:relative inset-y-0 left-0 z-40 lg:z-0',
          'pt-16 lg:pt-0',
          'transition-transform duration-200 lg:translate-x-0',
          showNav ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b">
          <Link href={`/courses/${courseId}`}>
            <Button variant="ghost" size="sm" className="-ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回目录
            </Button>
          </Link>
          <h2 className="font-bold mt-2 line-clamp-2">{course.title}</h2>
        </div>
        <ChapterNav
          courseId={courseId}
          chapters={course.chapters || []}
          currentLessonId={lessonId}
        />
      </aside>

      {/* Overlay for mobile nav */}
      <AnimatePresence>
        {showNav && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setShowNav(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          {/* Lesson Header */}
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-8"
          >
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">{lesson.title}</h1>
          </m.div>

          {/* Lesson Content */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.15 }}
          >
            <Card className="border border-border shadow-soft p-6 lg:p-8 mb-8">
              <MarkdownRenderer content={lesson.content || '暂无内容'} />
            </Card>
          </m.div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mb-8">
            {prevLesson ? (
              prevLesson.feishu_url ? (
                <a href={prevLesson.feishu_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    上一节
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              ) : (
                <Link href={`/courses/${courseId}/${prevLesson.id}`}>
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    上一节
                  </Button>
                </Link>
              )
            ) : (
              <div />
            )}
            {nextLesson ? (
              nextLesson.feishu_url ? (
                <a href={nextLesson.feishu_url} target="_blank" rel="noopener noreferrer">
                  <Button>
                    下一节
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              ) : (
                <Link href={`/courses/${courseId}/${nextLesson.id}`}>
                  <Button>
                    下一节
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )
            ) : (
              <Link href={`/courses/${courseId}`}>
                <Button>完成课程</Button>
              </Link>
            )}
          </div>

          {/* Mobile Quiz Toggle */}
          {lesson.questions && lesson.questions.length > 0 && (
            <div className="xl:hidden">
              <Button
                variant="outline"
                className="w-full mb-4"
                onClick={() => setShowQuiz(!showQuiz)}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                {showQuiz ? '隐藏测试' : '显示测试'} ({lesson.questions.length} 题)
              </Button>
              {showQuiz && (
                <Card className="border border-border shadow-soft p-6 mb-8">
                  <QuizPanel
                    lessonId={lessonId}
                    questions={lesson.questions}
                    userId={userId}
                  />
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right Quiz Panel - Desktop */}
      {lesson.questions && lesson.questions.length > 0 && (
        <aside className="hidden xl:block w-96 bg-card border-l shrink-0 overflow-y-auto">
          <div className="p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              课后测试
            </h3>
            <QuizPanel
              lessonId={lessonId}
              questions={lesson.questions}
              userId={userId}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

export function LessonNotFound({ courseId }: { courseId?: string }) {
  return (
    <div className="max-w-4xl mx-auto text-center py-16">
      <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-muted-foreground">课程内容不存在</p>
      <Link href={courseId ? `/courses/${courseId}` : '/courses'}>
        <Button className="mt-4">返回课程列表</Button>
      </Link>
    </div>
  );
}
