import { Suspense } from 'react';
import { Metadata } from 'next';
import { GalleryContent } from './gallery-content';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: '灵感墙 - Miracle Learning',
  description: '浏览和发现 Workshop 中的优秀作品',
};

export default function GalleryPage() {
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      <Suspense fallback={<GallerySkeleton />}>
        <GalleryContent />
      </Suspense>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="space-y-6">
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
