import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  ArrowLeft,
  FileText,
  ChevronRight,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CourseWithChapters } from '@/types/database';

interface CourseDetailProps {
  course: CourseWithChapters | null;
  courseId: string;
}

export function CourseDetail({ course, courseId }: CourseDetailProps) {
  if (!course) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">课程不存在</p>
        <Link href="/courses">
          <Button className="mt-4">返回课程列表</Button>
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
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Back Button */}
      <Link href="/courses">
        <Button variant="ghost" className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回课程列表
        </Button>
      </Link>

      {/* Course Header */}
      <Card className="border border-border shadow-soft overflow-hidden mb-10">
        <div className="relative">
          {course.cover_image ? (
            <div className="relative h-48 overflow-hidden">
              <Image
                src={course.cover_image}
                alt={course.title}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          ) : (
            <div className="h-48 bg-muted flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <h1 className="text-2xl font-semibold mb-2">{course.title}</h1>
            <div className="flex items-center gap-4 text-white/80 text-sm">
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{course.chapters?.length || 0} 章</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{totalLessons} 节课程</span>
              </div>
            </div>
          </div>
        </div>
        {course.description && (
          <CardContent className="p-6">
            <p className="text-muted-foreground">{course.description}</p>
            {firstLesson && (
              firstLesson.feishu_url ? (
                <a href={firstLesson.feishu_url} target="_blank" rel="noopener noreferrer">
                  <Button className="mt-4">
                    开始学习
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </a>
              ) : (
                <Link href={`/courses/${courseId}/${firstLesson.id}`}>
                  <Button className="mt-4">
                    开始学习
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )
            )}
          </CardContent>
        )}
      </Card>

      {/* Course Content */}
      <h2 className="text-xl font-semibold mb-6">课程目录</h2>
      <div className="space-y-4">
        {course.chapters?.map((chapter, chapterIndex) => (
          <div 
            key={chapter.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${chapterIndex * 50}ms` }}
          >
            <Card className="border border-border shadow-subtle overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>
                    第 {chapterIndex + 1} 章：{chapter.title}
                  </span>
                  <Badge variant="secondary">
                    {chapter.lessons?.length || 0} 节
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {chapter.lessons?.map((lesson, lessonIndex) => {
                    const hasFeishuUrl = !!lesson.feishu_url;
                    
                    const lessonContent = (
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors duration-150 group hover:translate-x-0.5">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors duration-150">
                          {chapterIndex + 1}.{lessonIndex + 1}
                        </div>
                        <span className="flex-1 text-foreground/70 group-hover:text-foreground transition-colors duration-150">
                          {lesson.title}
                        </span>
                        {hasFeishuUrl ? (
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
                        )}
                      </div>
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
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
