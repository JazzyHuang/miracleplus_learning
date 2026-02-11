import { Skeleton } from '@/components/ui/skeleton';

/**
 * AI 工具页面骨架屏
 */
export default function AIToolsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* Tool cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-secondary border border-border space-y-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-2 pt-2">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
