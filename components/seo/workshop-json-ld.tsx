import type { Workshop } from '@/types/database';

interface WorkshopJsonLdProps {
  workshop: Workshop;
  baseUrl?: string;
}

/**
 * Workshop 活动结构化数据组件
 * 使用 Schema.org Event 格式
 * 
 * 修复：使用正确的字段名 event_date（Workshop 类型中没有 start_date/end_date）
 */
export function WorkshopJsonLd({ workshop, baseUrl = 'https://miracle.learning' }: WorkshopJsonLdProps) {
  // 动态判断活动状态
  const eventDate = new Date(workshop.event_date);
  const now = new Date();
  let eventStatus = 'https://schema.org/EventScheduled';
  if (!workshop.is_active) {
    eventStatus = 'https://schema.org/EventCancelled';
  } else if (eventDate < now) {
    eventStatus = 'https://schema.org/EventCompleted';
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${baseUrl}/workshop/${workshop.id}`,
    name: workshop.title,
    description: workshop.description || `${workshop.title} - 奇绩创坛 Workshop 活动`,
    url: `${baseUrl}/workshop/${workshop.id}`,
    // image 应为数组格式（Schema.org 推荐）
    image: [workshop.cover_image || `${baseUrl}/og-default.png`],
    // 使用正确的字段名 event_date
    startDate: workshop.event_date,
    endDate: workshop.event_date, // 单日活动，开始和结束相同
    eventStatus,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: '奇绩创坛',
      url: 'https://miracleplus.com',
    },
    location: {
      '@type': 'Place',
      name: '奇绩创坛',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'CN',
      },
    },
    inLanguage: 'zh-CN',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
      availability: workshop.is_active 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/SoldOut',
    },
  };

  return (
    <script
      id={`workshop-jsonld-${workshop.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
