import { Skeleton } from '@/components/ui/skeleton';

export default function LeaderboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* TOP 3 podium skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center rounded-xl border border-border/50 bg-card/50 p-6 space-y-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>

      {/* Full leaderboard list skeleton */}
      <div className="rounded-xl border border-border/50 bg-card/50 divide-y divide-border/30">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
