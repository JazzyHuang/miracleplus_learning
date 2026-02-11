import { Skeleton } from '@/components/ui/skeleton';

export default function ArticleDetailLoading() {
  return (
    <div className="container max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Back badge */}
      <Skeleton className="h-6 w-16 rounded-full" />
      {/* Title */}
      <Skeleton className="h-10 w-3/4" />
      {/* Meta */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i === 9 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
