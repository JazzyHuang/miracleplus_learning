import { Suspense } from 'react';
import { Metadata } from 'next';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import { ShopContent } from './shop-content';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: '积分商城 - Miracle Learning',
  description: '使用积分兑换精选奖品和专属体验',
};

export default async function ShopPage() {
  const { authUser } = await getAuthUserWithProfile();
  if (!authUser) redirect('/login');

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      <Suspense fallback={<ShopSkeleton />}>
        <ShopContent userId={authUser.id} />
      </Suspense>
    </div>
  );
}

function ShopSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
