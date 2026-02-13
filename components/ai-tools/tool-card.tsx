'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, Heart, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ToolAvatar } from './tool-avatar';
import type { AITool } from '@/types/database';

interface ToolCardProps {
  tool: AITool;
  featured?: boolean;
  className?: string;
}

const pricingLabels = {
  free: { label: '免费', color: 'bg-success/10 text-success' },
  freemium: { label: '免费增值', color: 'bg-info/10 text-info' },
  paid: { label: '付费', color: 'bg-warning/10 text-warning' },
};

/**
 * AI 工具卡片组件（预览图模式）
 */
export function ToolCard({ tool, featured = false, className }: ToolCardProps) {
  const pricing = pricingLabels[tool.pricing_type];

  return (
    <Link href={`/ai-tools/${tool.slug}`} className="group block h-full">
      <Card
        className={cn(
          'border-0 shadow-md overflow-hidden h-full',
          'motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg motion-safe:hover:shadow-indigo-500/10',
          'transition-all duration-200',
          featured && 'ring-2 ring-warning/50',
          className
        )}
      >
        {/* 预览图区域 */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {tool.preview_image_url ? (
            <Image
              src={tool.preview_image_url}
              alt={`${tool.name} 预览`}
              fill
              className="object-cover motion-safe:group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/40">{tool.name[0]}</span>
            </div>
          )}
          {/* 标签覆盖层 */}
          <div className="absolute top-2 left-2 right-2 flex justify-between">
            {featured && (
              <Badge className="bg-warning text-white text-xs">
                <Star className="w-3 h-3 mr-1" />精选
              </Badge>
            )}
            <Badge className={cn('text-xs ml-auto', pricing.color)}>
              {pricing.label}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Logo */}
            <div className="shrink-0">
              <ToolAvatar name={tool.name} logoUrl={tool.logo_url} websiteUrl={tool.website_url} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{tool.name}</h3>
              {tool.category && (
                <p className="text-xs text-muted-foreground">{tool.category.name}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{tool.description}</p>

          {/* 统计 */}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              <span className="font-medium text-foreground">
                {tool.avg_rating > 0 ? tool.avg_rating.toFixed(1) : '-'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span>{tool.like_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{tool.comment_count}</span>
            </div>
          </div>

          {/* 标签 */}
          {tool.tags && tool.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {tool.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
              {tool.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">+{tool.tags.length - 3}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * 工具卡片骨架屏
 */
export function ToolCardSkeleton() {
  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-3/4 mt-1" />
        <div className="flex gap-4 mt-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}
