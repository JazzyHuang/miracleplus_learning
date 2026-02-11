import { Skeleton } from '@/components/ui/skeleton';

export default function AdminChapterEditLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* Grid: lesson list + editor */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Lesson list */}
        <div className="rounded-xl border border-border/50 bg-card p-4 lg:col-span-1 space-y-2">
          <Skeleton className="h-4 w-16 mb-3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>

        {/* Editor area */}
        <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
