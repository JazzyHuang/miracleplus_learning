'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Star, ExternalLink, Users, MessageSquare, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AITool } from '@/types/database';

interface ToolCardProps {
  tool: AITool;
  /** 是否显示为精选卡片 */
  featured?: boolean;
  /** 自定义类名 */
  className?: string;
}

const pricingLabels = {
  free: { label: '免费', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  freemium: { label: '免费增值', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  paid: { label: '付费', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

/**
 * AI 工具卡片组件
 */
export function ToolCard({ tool, featured = false, className }: ToolCardProps) {
  const pricing = pricingLabels[tool.pricing_type];

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/ai-tools/${tool.slug}`}>
        <Card
          className={cn(
            'border-0 shadow-md overflow-hidden transition-shadow hover:shadow-lg h-full',
            featured && 'ring-2 ring-amber-400/50',
            className
          )}
        >
          {featured && (
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-4 py-1 text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              精选工具
            </div>
          )}

          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Logo */}
              <div className="shrink-0">
                {tool.logo_url ? (
                  <Image
                    src={tool.logo_url}
                    alt={tool.name}
                    width={56}
                    height={56}
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {tool.name[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg truncate">{tool.name}</h3>
                  <Badge className={cn('shrink-0 text-xs', pricing.color)}>
                    {pricing.label}
                  </Badge>
                </div>

                {tool.category && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tool.category.name}
                  </p>
                )}

                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {tool.description}
                </p>

                {/* 统计信息 */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {/* 评分 */}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-foreground">
                      {tool.avg_rating > 0 ? tool.avg_rating.toFixed(1) : '-'}
                    </span>
                    {tool.rating_count > 0 && (
                      <span className="text-xs">({tool.rating_count})</span>
                    )}
                  </div>

                  {/* 体验数 */}
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{tool.experience_count}</span>
                  </div>

                  {/* 案例数 */}
                  {tool.case_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{tool.case_count}</span>
                    </div>
                  )}
                </div>

                {/* 标签 */}
                {tool.tags && tool.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tool.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {tool.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{tool.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </m.div>
  );
}

/**
 * 工具卡片骨架屏
 */
export function ToolCardSkeleton() {
  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
