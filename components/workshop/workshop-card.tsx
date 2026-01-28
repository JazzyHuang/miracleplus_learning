'use client';

import { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarDays, Users, ArrowRight, ExternalLink, ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Workshop } from '@/types/database';

interface WorkshopCardProps {
  workshop: Workshop;
  checkinCount?: number;
  /** 是否为首屏活动（优先加载图片） */
  priority?: boolean;
}

/**
 * Workshop 卡片组件
 * 
 * Phase 5 优化：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 添加图片加载状态和错误处理
 * 3. 添加 priority 属性支持首屏图片优化
 */
function WorkshopCardComponent({ workshop, checkinCount = 0, priority = false }: WorkshopCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);
  const eventDate = new Date(workshop.event_date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();
  const hasFeishuUrl = !!workshop.feishu_url;

  const cardContent = (
    <Card className="group overflow-hidden border border-border hover:border-foreground/20 shadow-soft hover:shadow-medium transition-all duration-200 rounded-xl hover:-translate-y-0.5">
        {/* Cover Image */}
        <div className="relative h-48 overflow-hidden bg-muted rounded-t-xl">
          {workshop.cover_image && !imageError ? (
            <>
              {imageLoading && (
                <Skeleton className="absolute inset-0 rounded-none" aria-label="图片加载中" />
              )}
              <Image
                src={workshop.cover_image}
                alt={workshop.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`object-cover group-hover:scale-[1.02] transition-transform duration-200 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                priority={priority}
                loading={priority ? undefined : 'lazy'}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {imageError ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                  <ImageOff className="w-10 h-10" aria-hidden="true" />
                  <span className="text-xs">图片加载失败</span>
                </div>
              ) : (
                <CalendarDays className="w-14 h-14 text-muted-foreground/30" aria-hidden="true" />
              )}
            </div>
          )}
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isUpcoming && (
              <Badge className="bg-foreground text-background">
                即将开始
              </Badge>
            )}
            {isPast && workshop.is_active && (
              <Badge variant="secondary" className="bg-background/90 text-foreground border border-border">
                可打卡
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-foreground transition-colors">
            {workshop.title}
          </h3>
          
          {workshop.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {workshop.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" aria-hidden="true" />
                <span>{format(eventDate, 'MM月dd日', { locale: zhCN })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" aria-hidden="true" />
                <span>{checkinCount} 人打卡</span>
              </div>
            </div>
            {hasFeishuUrl ? (
              <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all duration-200" />
            ) : (
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
            )}
          </div>
        </CardContent>
      </Card>
  );

  // If feishu_url exists, open in new tab; otherwise navigate to detail page
  if (hasFeishuUrl) {
    return (
      <a 
        href={workshop.feishu_url!} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={`/workshop/${workshop.id}`}>
      {cardContent}
    </Link>
  );
}

/**
 * 使用 React.memo 优化，避免父组件重渲染时不必要的子组件更新
 * 自定义比较函数：比较所有可能影响渲染的 props
 */
export const WorkshopCard = memo(WorkshopCardComponent, (prevProps, nextProps) => {
  const prevWorkshop = prevProps.workshop;
  const nextWorkshop = nextProps.workshop;
  
  return (
    prevWorkshop.id === nextWorkshop.id &&
    prevWorkshop.title === nextWorkshop.title &&
    prevWorkshop.description === nextWorkshop.description &&
    prevWorkshop.cover_image === nextWorkshop.cover_image &&
    prevWorkshop.event_date === nextWorkshop.event_date &&
    prevWorkshop.is_active === nextWorkshop.is_active &&
    prevWorkshop.feishu_url === nextWorkshop.feishu_url &&
    prevProps.checkinCount === nextProps.checkinCount &&
    prevProps.priority === nextProps.priority
  );
});
