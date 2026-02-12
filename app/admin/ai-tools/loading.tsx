import { Skeleton } from '@/components/ui/skeleton';

export default function AdminAIToolsLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-24 mt-1" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-11 w-80 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
