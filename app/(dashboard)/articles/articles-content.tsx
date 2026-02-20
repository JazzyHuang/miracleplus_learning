'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { m } from 'framer-motion';
import { Newspaper, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { DB } from '@/lib/db-tables';

interface Article {
  id: string;
  title: string;
  summary: string | null;
  type: 'daily' | 'monthly';
  cover_image: string | null;
  reading_time_estimate: number;
  published_at: string;
  view_count: number;
}

interface ArticleRead {
  article_id: string;
  completed: boolean;
}

type ArticleType = 'all' | 'daily' | 'monthly';

/**
 * 日报月报列表页
 */
export function ArticlesContent() {
  const { user } = useUser();
  const [activeType, setActiveType] = useState<ArticleType>('all');

  // Fetch articles
  const { data: articles, loading } = useCachedQuery<Article[]>(
    `articles-${activeType}`,
    async () => {
      const supabase = createClient();
      let query = (supabase.from(DB.articles) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('id, title, summary, type, cover_image, reading_time_estimate, published_at, view_count')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(30);

      if (activeType !== 'all') {
        query = query.eq('type', activeType);
      }

      const { data } = await query;
      return (data as Article[]) ?? [];
    },
    { ttl: 60000 }
  );

  // Fetch user's read status
  const { data: reads } = useCachedQuery<ArticleRead[]>(
    `article-reads-${user?.id}`,
    async () => {
      if (!user) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from(DB.article_reads)
        .select('article_id, completed')
        .eq('user_id', user.id) as { data: ArticleRead[] | null };
      return (data as ArticleRead[]) ?? [];
    },
    { ttl: 30000, enabled: !!user }
  );

  const readMap = new Map((reads ?? []).map(r => [r.article_id, r.completed]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="日报月报"
        description="阅读最新的 AI 学习资讯和深度报告"
        icon={Newspaper}
      />

      {/* Type filter */}
      <div className="flex gap-2">
        {[
          { id: 'all' as const, label: '全部' },
          { id: 'daily' as const, label: '日报' },
          { id: 'monthly' as const, label: '月报' },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setActiveType(type.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeType === type.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/30 hover:text-card-foreground border border-border/50'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Article list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card shadow-sm p-5 animate-pulse space-y-3">
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : !articles || articles.length === 0 ? (
        <EmptyState
          title="暂无文章"
          description="管理员发布文章后会显示在这里"
        />
      ) : (
        <div className="space-y-3">
          {articles.map((article, index) => {
            const isRead = readMap.get(article.id);
            return (
              <m.div
                key={article.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
              >
                <Link href={`/articles/${article.id}`}>
                  <div className={`group rounded-xl border p-5 transition-all duration-200 hover:border-primary/20 shadow-sm ${
                    isRead
                      ? 'border-border/50 bg-card'
                      : 'border-border/50 bg-card'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={article.type === 'monthly' ? 'default' : 'secondary'} className="text-xs">
                            {article.type === 'monthly' ? '月报' : '日报'}
                          </Badge>
                          {isRead && (
                            <span className="flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 className="w-3 h-3" />
                              已读
                            </span>
                          )}
                        </div>
                        <h3 className={`font-medium group-hover:text-primary transition-colors ${
                          isRead ? 'text-muted-foreground' : 'text-card-foreground'
                        }`}>
                          {article.title}
                        </h3>
                        {article.summary && (
                          <p className="text-sm text-muted-foreground/70 line-clamp-2">{article.summary}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.reading_time_estimate} 分钟
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.view_count}
                          </span>
                          <span>
                            {new Date(article.published_at).toLocaleDateString('zh-CN')}
                          </span>
                          {!isRead && (
                            <span className="text-primary">
                              +{article.type === 'monthly' ? '10' : '5'} 积分
                            </span>
                          )}
                        </div>
                      </div>
                      {article.cover_image && (
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <Image
                            src={article.cover_image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 96px"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </m.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
