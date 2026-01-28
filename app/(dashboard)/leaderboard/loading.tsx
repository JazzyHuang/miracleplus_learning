import { Skeleton } from '@/components/ui/skeleton';

export default function LeaderboardLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
