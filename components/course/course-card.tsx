import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Course, Chapter } from '@/types/database';

interface CourseCardProps {
  course: Course & { chapters?: Chapter[] };
}

export function CourseCard({ course }: CourseCardProps) {
  const totalLessons = course.chapters?.reduce(
    (acc, chapter) => acc + (chapter.lessons?.length || 0),
    0
  ) || 0;

  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="group overflow-hidden border border-border hover:border-foreground/20 shadow-soft hover:shadow-medium transition-all duration-200 h-full rounded-xl hover:-translate-y-0.5">
        {/* Cover Image */}
        <div className="relative h-44 overflow-hidden bg-muted rounded-t-xl">
          {course.cover_image ? (
            <Image
              src={course.cover_image}
              alt={course.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-14 h-14 text-muted-foreground/30" />
            </div>
          )}
          {/* Progress overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
            <div 
              className="h-full bg-foreground transition-all duration-700"
              style={{ width: '35%' }}
            />
          </div>
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
                <FileText className="w-4 h-4" />
                <span>{course.chapters?.length || 0} 章</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{totalLessons} 节</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
