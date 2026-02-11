import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nav skeleton */}
        <div className="lg:w-56 shrink-0">
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
