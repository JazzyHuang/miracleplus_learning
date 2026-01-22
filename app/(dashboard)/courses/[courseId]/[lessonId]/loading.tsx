import { Skeleton } from '@/components/ui/skeleton';

export default function LessonLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Lesson Title */}
      <Skeleton className="h-9 w-3/4 mb-8" />

      {/* Content */}
      <div className="space-y-4 mb-8">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}
