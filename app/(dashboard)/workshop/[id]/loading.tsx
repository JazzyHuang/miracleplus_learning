import { Skeleton } from '@/components/ui/skeleton';

export default function WorkshopDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cover image */}
      <Skeleton className="h-48 w-full rounded-xl" />
      {/* Title + meta */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      {/* Action buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      {/* Checkins grid */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
