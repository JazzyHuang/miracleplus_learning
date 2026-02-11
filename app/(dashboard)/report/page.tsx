import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { ReportContent } from './report-content';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'AI 认知报告 - Miracle Learning',
  description: '查看你的个人 AI 学习认知报告',
};

export default async function ReportPage() {
  const { authUser, profile } = await getAuthUserWithProfile();
  if (!authUser) redirect('/login');

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <Suspense fallback={<ReportSkeleton />}>
        <ReportContent userId={authUser.id} userName={profile?.name ?? '学员'} />
      </Suspense>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
