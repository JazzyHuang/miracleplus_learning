import { Skeleton } from '@/components/ui/skeleton';

export default function CourseDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Back Button */}
      <Skeleton className="h-9 w-24 mb-6" />

      {/* Course Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-3/4 mb-3" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>

      {/* Chapter List */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <div className="space-y-2 pl-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-full max-w-xs" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
