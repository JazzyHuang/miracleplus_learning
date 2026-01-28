'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronRight, FileText, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChapterWithLessons, Lesson } from '@/types/database';

interface ChapterNavProps {
  courseId: string;
  chapters: ChapterWithLessons[];
  currentLessonId?: string;
}

/**
 * 章节导航组件
 * 
 * Phase 4 改进：
 * 1. 展开状态持久化到 localStorage
 * 2. 使用 React.memo 优化课时项重渲染
 * 
 * Hydration 修复：
 * 1. 使用一致的默认值初始化 useState（避免 SSR/CSR 不匹配）
 * 2. 在 useEffect 中从 localStorage 恢复状态（仅在客户端挂载后）
 */
export function ChapterNav({ courseId, chapters, currentLessonId }: ChapterNavProps) {
  const storageKey = `chapter-nav-${courseId}`;
  
  // 使用一致的默认值初始化（所有章节展开），避免 hydration mismatch
  const defaultExpanded = chapters.map((c) => c.id);
  const [expandedChapters, setExpandedChapters] = useState<string[]>(defaultExpanded);
  // 使用 useState 而非 useRef，确保保存 effect 在状态恢复后的重渲染中才执行
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 挂载后从 localStorage 恢复状态
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setExpandedChapters(parsed);
        }
      }
    } catch {
      // localStorage 读取失败，忽略
    }
    // 设置 isHydrated 会触发重渲染，保存 effect 将在下一个渲染周期中
    // 使用已恢复的 expandedChapters 值执行
    setIsHydrated(true);
  }, [storageKey]);
  
  // 状态变化后保存到 localStorage（仅在 hydration 完成后）
  // isHydrated 在依赖数组中确保此 effect 在 hydration 完成后的重渲染中执行
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(expandedChapters));
    } catch {
      // localStorage 写入失败，忽略
    }
  }, [expandedChapters, storageKey, isHydrated]);

  const toggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  }, []);

  return (
    <ScrollArea className="h-full">
      <nav className="p-4 space-y-2">
        {chapters.map((chapter, chapterIndex) => {
          const isExpanded = expandedChapters.includes(chapter.id);
          
          return (
            <div key={chapter.id} className="space-y-1">
              {/* Chapter Header */}
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <m.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </m.div>
                <span className="font-medium text-sm flex-1">
                  {chapterIndex + 1}. {chapter.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {chapter.lessons?.length || 0}节
                </span>
              </button>

              {/* Lessons */}
              <AnimatePresence>
                {isExpanded && chapter.lessons && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-6 space-y-1 border-l-2 border-muted pl-4">
                      {chapter.lessons.map((lesson, lessonIndex) => (
                        <LessonNavItem
                          key={lesson.id}
                          lesson={lesson}
                          courseId={courseId}
                          chapterIndex={chapterIndex}
                          lessonIndex={lessonIndex}
                          isActive={lesson.id === currentLessonId}
                        />
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </ScrollArea>
  );
}

/**
 * Phase 4: 使用 React.memo 优化的课时导航项
 */
interface LessonNavItemProps {
  lesson: Lesson;
  courseId: string;
  chapterIndex: number;
  lessonIndex: number;
  isActive: boolean;
}

const LessonNavItem = memo(function LessonNavItem({
  lesson,
  courseId,
  chapterIndex,
  lessonIndex,
  isActive,
}: LessonNavItemProps) {
  const isCompleted = false; // TODO: Track progress
  const hasFeishuUrl = !!lesson.feishu_url;
  
  const lessonContent = (
    <m.div
      whileHover={{ x: 2 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg text-sm transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
      ) : hasFeishuUrl ? (
        <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : (
        <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      <span className="line-clamp-1">
        {chapterIndex + 1}.{lessonIndex + 1} {lesson.title}
      </span>
    </m.div>
  );

  if (hasFeishuUrl) {
    return (
      <a
        href={lesson.feishu_url!}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${lesson.title}（在新标签页打开）`}
      >
        {lessonContent}
      </a>
    );
  }

  return (
    <Link
      href={`/courses/${courseId}/${lesson.id}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {lessonContent}
    </Link>
  );
});
