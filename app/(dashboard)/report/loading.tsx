import { Skeleton } from '@/components/ui/skeleton';

export default function ReportLoading() {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-8">
      <div className="space-y-2 text-center">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
