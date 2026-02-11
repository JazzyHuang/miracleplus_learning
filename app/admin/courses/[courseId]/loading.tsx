import { Skeleton } from '@/components/ui/skeleton';

export default function AdminCourseEditLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* Course info card */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>

      {/* Chapters */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-2 pl-7">
            {Array.from({ length: 2 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
