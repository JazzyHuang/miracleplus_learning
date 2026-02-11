import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Profile header skeleton */}
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 text-center md:text-left">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="ml-auto h-9 w-24 rounded-md" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Level progress skeleton */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border/50 pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
              <Skeleton className="h-10 w-10 rounded-full mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
