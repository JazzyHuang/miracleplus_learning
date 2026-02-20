'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { m } from 'framer-motion';
import { ArrowLeft, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { useReadingTracker } from '@/hooks/use-reading-tracker';
import { MarkdownRenderer } from '@/components/course/markdown-renderer';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import type { Article } from '@/types/database';

interface ArticleDetailContentProps {
  article: Article;
}

/**
 * 文章详情页
 * 
 * 集成 useReadingTracker 进行阅读时间验证。
 * 阅读完成条件: 停留 >= 2分钟 且 滚动深度 >= 70%
 */
export function ArticleDetailContent({ article }: ArticleDetailContentProps) {
  const { user } = useUser();
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    timeSpent,
    scrollDepth: _scrollDepth,
    completed,
    pointsAwarded,
    progress,
  } = useReadingTracker(article.id, user?.id, contentRef, {
    minReadingTime: 120,
    minScrollDepth: 0.7,
  });

  const points = article.type === 'monthly' ? 10 : 5;

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Back link */}
      <Link
        href="/articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Link>

      {/* Article header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={article.type === 'monthly' ? 'default' : 'secondary'}>
            {article.type === 'monthly' ? '月报' : '日报'}
          </Badge>
          {completed && (
            <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              阅读完成
              {pointsAwarded && ` +${points}积分`}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-medium text-foreground leading-tight tracking-tight">
          {article.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-foreground/50">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            约 {article.reading_time_estimate} 分钟
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {article.view_count} 次阅读
          </span>
          <span>{article.published_at ? new Date(article.published_at).toLocaleDateString('zh-CN') : ''}</span>
        </div>
      </div>

      {/* Cover image */}
      {article.cover_image && (
        <div className="relative rounded-xl overflow-hidden max-h-80 aspect-video">
          <Image src={article.cover_image} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
        </div>
      )}

      {/* Reading progress indicator (sticky) */}
      {user && !completed && (
        <div className="sticky top-14 z-30 -mx-4 px-4 py-2 bg-background/90 backdrop-blur-xl border-b border-surface-dark-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground/50 shrink-0">阅读进度</span>
            <Progress value={progress} className="flex-1 h-1.5" />
            <span className="text-xs text-foreground/50 shrink-0">
              {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, '0')} / 2:00
            </span>
          </div>
        </div>
      )}

      {/* Article content */}
      <div ref={contentRef} className="prose prose-invert prose-lg max-w-none">
        <MarkdownRenderer content={article.content} />
      </div>

      {/* Completion message */}
      {completed && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-success/20 bg-success/5"
        >
          <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
          <div>
            <p className="text-sm font-medium text-success">阅读完成!</p>
            <p className="text-xs text-muted-foreground">
              {pointsAwarded
                ? `已获得 ${points} 积分奖励`
                : '阅读进度已保存'}
            </p>
          </div>
        </m.div>
      )}
    </m.div>
  );
}
