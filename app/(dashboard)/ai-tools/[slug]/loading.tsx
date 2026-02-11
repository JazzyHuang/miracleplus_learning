import { Skeleton } from '@/components/ui/skeleton';

export default function AIToolDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + breadcrumb */}
      <Skeleton className="h-8 w-32 rounded-lg" />
      {/* Tool header */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      {/* Rating + actions */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      {/* Tabs + content */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
