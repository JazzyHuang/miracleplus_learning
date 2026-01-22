import { Skeleton } from '@/components/ui/skeleton';

export default function WorkshopDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Back Button */}
      <Skeleton className="h-9 w-24 mb-6" />

      {/* Workshop Header */}
      <div className="rounded-xl border border-border overflow-hidden mb-8">
        <Skeleton className="h-64 w-full" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>

      {/* Checkin Section */}
      <div className="rounded-xl border border-border p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
