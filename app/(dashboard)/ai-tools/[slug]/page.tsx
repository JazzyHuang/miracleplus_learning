import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolDetailContent } from './tool-detail-content';
import { createClient } from '@/lib/supabase/server';
import { createAIToolsService } from '@/lib/ai-tools';
import { Skeleton } from '@/components/ui/skeleton';

interface ToolDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * 动态生成元数据
 */
export async function generateMetadata({
  params,
}: ToolDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const aiToolsService = createAIToolsService(supabase);
  const tool = await aiToolsService.getToolBySlug(slug);

  if (!tool) {
    return {
      title: '工具未找到 | Miracle Learning',
    };
  }

  return {
    title: `${tool.name} | AI 体验台 | Miracle Learning`,
    description: tool.description || `了解和体验 ${tool.name}`,
    openGraph: {
      title: `${tool.name} - AI 工具`,
      description: tool.description || `了解和体验 ${tool.name}`,
      type: 'website',
      images: tool.logo_url ? [{ url: tool.logo_url }] : undefined,
    },
  };
}

/**
 * 页面骨架屏
 */
function ToolDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 返回按钮 */}
      <Skeleton className="h-10 w-32 mb-6" />

      {/* 工具头部 */}
      <div className="flex gap-6 mb-8">
        <Skeleton className="w-24 h-24 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* 标签页 */}
      <Skeleton className="h-10 w-full mb-6" />

      {/* 内容区 */}
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * 工具详情页
 */
export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const aiToolsService = createAIToolsService(supabase);
  const tool = await aiToolsService.getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  // 获取灵感碎片
  const experiences = await aiToolsService.getExperiences(tool.id, 10);

  return (
    <Suspense fallback={<ToolDetailSkeleton />}>
      <ToolDetailContent tool={tool} initialExperiences={experiences} />
    </Suspense>
  );
}
