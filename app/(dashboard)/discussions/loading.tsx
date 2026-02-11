import { Skeleton } from '@/components/ui/skeleton';

/**
 * Discussions 页面骨架屏
 * 匹配 discussions-content.tsx 的实际布局
 */
export default function DiscussionsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Sort tabs + tags skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
        <div className="w-px h-5 bg-border mx-1" />
        <Skeleton className="h-7 w-14 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
      </div>

      {/* Discussion cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-secondary border border-border"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-4 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
