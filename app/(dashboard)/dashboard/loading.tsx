import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Welcome header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Quick access cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Points & Leaderboard skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
