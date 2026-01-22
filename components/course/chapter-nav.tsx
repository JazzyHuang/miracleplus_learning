'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, FileText, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChapterWithLessons } from '@/types/database';

interface ChapterNavProps {
  courseId: string;
  chapters: ChapterWithLessons[];
  currentLessonId?: string;
}

export function ChapterNav({ courseId, chapters, currentLessonId }: ChapterNavProps) {
  const [expandedChapters, setExpandedChapters] = useState<string[]>(
    chapters.map((c) => c.id) // All expanded by default
  );

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

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
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
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
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-6 space-y-1 border-l-2 border-muted pl-4">
                      {chapter.lessons.map((lesson, lessonIndex) => {
                        const isActive = lesson.id === currentLessonId;
                        const isCompleted = false; // TODO: Track progress
                        const hasFeishuUrl = !!lesson.feishu_url;
                        
                        const lessonContent = (
                          <motion.div
                            whileHover={{ x: 2 }}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg text-sm transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : hasFeishuUrl ? (
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="line-clamp-1">
                              {chapterIndex + 1}.{lessonIndex + 1} {lesson.title}
                            </span>
                          </motion.div>
                        );

                        if (hasFeishuUrl) {
                          return (
                            <a
                              key={lesson.id}
                              href={lesson.feishu_url!}
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
