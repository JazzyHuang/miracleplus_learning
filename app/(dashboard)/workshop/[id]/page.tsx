import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getWorkshopById } from '@/lib/supabase/queries';
import { WorkshopDetail } from '@/components/workshop';
import { WorkshopJsonLd } from '@/components/seo';

interface WorkshopDetailPageProps {
  params: Promise<{ id: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

// 缓存策略由 getWorkshopById 内的 'use cache' + cacheLife('workshops') 控制

/**
 * 动态生成 Workshop 页面的 Metadata
 */
export async function generateMetadata({ params }: WorkshopDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const workshopData = await getWorkshopById(id);
  const workshop = workshopData.workshop;
  
  if (!workshop) {
    return {
      title: '活动不存在 | Miracle Learning',
    };
  }

  const title = `${workshop.title} | Miracle Learning`;
  const description = workshop.description || `参与 ${workshop.title} - 奇绩创坛 Workshop 活动`;

  return {
    title,
    description,
    openGraph: {
      title: workshop.title,
      description,
      type: 'article',
      url: `${BASE_URL}/workshop/${id}`,
      images: workshop.cover_image ? [
        {
          url: workshop.cover_image,
          width: 1200,
          height: 630,
          alt: workshop.title,
        },
      ] : undefined,
      siteName: 'Miracle Learning',
    },
    twitter: {
      card: 'summary_large_image',
      title: workshop.title,
      description,
      images: workshop.cover_image ? [workshop.cover_image] : undefined,
    },
    alternates: {
      canonical: `${BASE_URL}/workshop/${id}`,
    },
  };
}

export default async function WorkshopDetailPage({ params }: WorkshopDetailPageProps) {
  const { id } = await params;
  
  // User data is already fetched in layout and provided via UserContext
  // WorkshopDetail uses useUser() hook to access it - no duplicate fetching
  const workshopData = await getWorkshopById(id);

  if (!workshopData.workshop) {
    notFound();
  }

  // If workshop has feishu_url, redirect to it (with protocol validation)
  if (workshopData.workshop.feishu_url) {
    try {
      const url = new URL(workshopData.workshop.feishu_url);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        redirect(workshopData.workshop.feishu_url);
      }
    } catch {
      // Invalid URL, don't redirect
    }
  }

  return (
    <>
      <WorkshopJsonLd workshop={workshopData.workshop} baseUrl={BASE_URL} />
      <WorkshopDetail 
        workshop={workshopData.workshop} 
        initialCheckins={workshopData.checkins} 
      />
    </>
  );
}
