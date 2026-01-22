import { Skeleton } from '@/components/ui/skeleton';

export default function CoursesLoading() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Search Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-12 w-full max-w-md rounded-lg" />
      </div>

      {/* Course Grid Skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <Skeleton className="h-44 w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
