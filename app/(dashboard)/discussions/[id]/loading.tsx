import { Skeleton } from '@/components/ui/skeleton';

export default function DiscussionDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-20 rounded-lg" />
      {/* Discussion header */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      {/* Comments */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
