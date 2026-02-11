import { Skeleton } from '@/components/ui/skeleton';

export default function GalleryLoading() {
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className={`w-full rounded-xl ${i % 3 === 0 ? 'h-72' : i % 3 === 1 ? 'h-56' : 'h-64'}`} />
        ))}
      </div>
    </div>
  );
}
