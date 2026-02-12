import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolDetailContent } from './tool-detail-content';
import { createClient } from '@/lib/supabase/server';
import { createAIToolsService } from '@/lib/ai-tools';
import { logger } from '@/lib/logger';
import type { ToolExperience } from '@/types/database';

interface ToolDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * React cache() 确保同一请求内 generateMetadata 和 page 共享同一次查询
 */
const getCachedTool = cache(async (slug: string) => {
  const supabase = await createClient();
  const service = createAIToolsService(supabase);
  return service.getToolBySlug(slug);
});

/**
 * 动态生成元数据
 */
export async function generateMetadata({
  params,
}: ToolDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getCachedTool(slug);

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
 * 工具详情页
 * 使用 getCachedTool 避免 generateMetadata 和 page 双重查询
 */
export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { slug } = await params;
  const tool = await getCachedTool(slug);

  if (!tool) {
    notFound();
  }

  const supabase = await createClient();
  const aiToolsService = createAIToolsService(supabase);

  let experiences: ToolExperience[] = [];
  try {
    experiences = await aiToolsService.getExperiences(tool.id, 10);
  } catch (err) {
    logger.error('获取灵感碎片失败', err instanceof Error ? err : new Error(String(err)));
  }

  return <ToolDetailContent tool={tool} initialExperiences={experiences} />;
}
