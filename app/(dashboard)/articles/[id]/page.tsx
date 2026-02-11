import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createCacheClient } from '@/lib/supabase/server';
import { ArticleDetailContent } from './article-detail-content';
import { Skeleton } from '@/components/ui/skeleton';
import { DB, RPC } from '@/lib/db-tables';
import type { Article } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createCacheClient();
  const { data: article } = await supabase
    .from(DB.articles)
    .select('title, summary')
    .eq('id', id)
    .eq('is_published', true)
    .single() as { data: { title: string; summary: string | null } | null };

  if (!article) return { title: '文章未找到' };

  return {
    title: `${article.title} - Miracle Learning`,
    description: article.summary || undefined,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createCacheClient();
  const { data: article } = await supabase
    .from(DB.articles)
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single() as { data: Article | null };

  if (!article) notFound();

  // Increment view count atomically (fire and forget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.rpc as any)(RPC.increment_article_view_count, { p_article_id: id }).then(
    ({ error }: { error: { message: string } | null }) => { if (error) console.error('[article view_count] update failed:', error.message); }
  );

  return (
    <div className="container max-w-3xl mx-auto py-6 px-4">
      <Suspense fallback={<ArticleDetailSkeleton />}>
        <ArticleDetailContent article={article} />
      </Suspense>
    </div>
  );
}

function ArticleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-10 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
