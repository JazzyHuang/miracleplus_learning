import { Skeleton } from '@/components/ui/skeleton';

export default function LessonLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button + breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Lesson title */}
      <Skeleton className="h-8 w-3/4" />
      {/* Lesson content */}
      <div className="space-y-4 rounded-xl border border-border/50 bg-card p-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Complete button */}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {/* Quiz section */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
