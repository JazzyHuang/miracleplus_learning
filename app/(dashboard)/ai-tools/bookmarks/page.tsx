'use client';

import { Bookmark, ExternalLink, Star } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DB } from '@/lib/db-tables';

interface BookmarkedTool {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avg_rating: number;
  pricing_type: string;
}

export default function BookmarksPage() {
  const { user } = useUser();

  const { data: tools, loading } = useCachedQuery<BookmarkedTool[]>(
    `bookmarked-tools-${user?.id}`,
    async () => {
      if (!user) return [];
      const supabase = createClient();
      const { data: bookmarks } = await supabase
        .from(DB.user_bookmarks)
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'tool');

      if (!bookmarks || bookmarks.length === 0) return [];

      const toolIds = bookmarks.map((b: { target_id: string }) => b.target_id);
      const { data: tools } = await supabase
        .from(DB.ai_tools)
        .select('id, name, slug, description, avg_rating, pricing_type')
        .in('id', toolIds);

      return (tools as BookmarkedTool[]) ?? [];
    },
    { ttl: 30000, enabled: !!user }
  );

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <PageHeader title="我的收藏" description="你收藏的 AI 工具" icon={Bookmark} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-card animate-pulse shadow-sm" />
          ))}
        </div>
      ) : !tools || tools.length === 0 ? (
        <EmptyState title="暂无收藏" description="浏览 AI 工具时点击收藏按钮即可添加" />
      ) : (
        <div className="space-y-3">
          {tools.map(tool => (
            <Link key={tool.id} href={`/ai-tools/${tool.slug}`}>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-colors shadow-sm">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-card-foreground">{tool.name}</h3>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{tool.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {tool.avg_rating?.toFixed(1) ?? '-'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      tool.pricing_type === 'free' ? 'bg-success/10 text-success' :
                      tool.pricing_type === 'freemium' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {tool.pricing_type === 'free' ? '免费' : tool.pricing_type === 'freemium' ? '免费+付费' : '付费'}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground/70 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
