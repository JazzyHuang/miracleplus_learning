import { Skeleton } from '@/components/ui/skeleton';

export default function InviteLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
