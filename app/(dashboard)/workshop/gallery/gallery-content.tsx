'use client';

import { useState } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { Heart, MessageCircle, Trophy, Sparkles, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LikeButton } from '@/components/common/like-button';
import { DB } from '@/lib/db-tables';

interface GallerySubmission {
  id: string;
  user_id: string;
  workshop_id: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  status: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  workshop: {
    id: string;
    title: string;
  } | null;
}

type SortBy = 'latest' | 'popular';

const MASONRY_BREAKPOINTS = {
  default: 3,
  1024: 2,
  640: 1,
};

/**
 * 灵感墙 - 瀑布流展示Workshop作品
 * 
 * Features:
 * - Masonry layout (react-masonry-css)
 * - Filter by workshop / sort by latest or popular
 * - TOP3 highlight area
 * - Like (投币) functionality
 */
export function GalleryContent() {
  const { user } = useUser();
  const [sortBy, setSortBy] = useState<SortBy>('popular');

  // Fetch submissions
  const { data: submissions, loading } = useCachedQuery<GallerySubmission[]>(
    `gallery-submissions-${sortBy}`,
    async () => {
      const supabase = createClient();
      let query = supabase
        .from(DB.workshop_submissions)
        .select(`
          id, user_id, workshop_id, content, image_url, link_url,
          status, like_count, comment_count, created_at,
          user:${DB.users} (id, name, avatar_url),
          workshop:${DB.workshops} (id, title)
        `)
        .in('status', ['approved', 'featured']);

      if (sortBy === 'popular') {
        query = query.order('like_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query = query.limit(50);
      const { data } = await query;
      return (data as unknown as GallerySubmission[]) ?? [];
    },
    { ttl: 30000 }
  );

  const items = submissions ?? [];
  const top3 = [...items].sort((a, b) => b.like_count - a.like_count).slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader
        title="灵感墙"
        description="浏览和发现 Workshop 中的优秀作品"
        icon={Sparkles}
      />

      {/* TOP3 Highlight */}
      {top3.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-medium text-foreground">本期 TOP 3</h2>
            <span className="text-xs text-muted-foreground">获得 3 分钟分享机会</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((item, index) => (
              <m.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-xl border overflow-hidden shadow-sm ${
                  index === 0
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : index === 1
                    ? 'border-border bg-muted/50'
                    : 'border-orange-500/30 bg-orange-500/5'
                }`}
              >
                {/* Rank badge */}
                <div className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-500 text-white' :
                  index === 1 ? 'bg-muted-foreground text-white' :
                  'bg-orange-400 text-white'
                }`}>
                  {index + 1}
                </div>

                {/* Image */}
                {item.image_url && (
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={item.image_url}
                      alt={item.content || 'Workshop作品'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-2">
                  {item.content && (
                    <p className="text-sm text-card-foreground/80 line-clamp-2">{item.content}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={item.user?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-muted">{item.user?.name?.[0] ?? 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{item.user?.name ?? '匿名'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="w-3 h-3" />
                      {item.like_count}
                    </div>
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1">
          {[
            { id: 'popular' as const, label: '最热' },
            { id: 'latest' as const, label: '最新' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                sortBy === opt.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry gallery */}
      {loading ? (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`rounded-xl bg-card animate-pulse ${
              i % 3 === 0 ? 'h-72' : i % 3 === 1 ? 'h-56' : 'h-64'
            }`} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="还没有作品"
          description="参加 Workshop 并提交你的作品，它会出现在这里"
        />
      ) : (
        <Masonry
          breakpointCols={MASONRY_BREAKPOINTS}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {items.map((item, index) => (
            <m.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              className="mb-4 group rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/20 transition-all duration-300 shadow-sm"
            >
              {/* Image */}
              {item.image_url && (
                <div className="relative overflow-hidden" style={{ minHeight: 160 }}>
                  <Image
                    src={item.image_url}
                    alt={item.content || 'Workshop作品'}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                    unoptimized
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-3">
                {item.content && (
                  <p className="text-sm text-card-foreground/80 line-clamp-4">{item.content}</p>
                )}

                {/* Workshop tag */}
                {item.workshop && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.workshop.title}
                  </span>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={item.user?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-muted">{item.user?.name?.[0] ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{item.user?.name ?? '匿名'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                    {user && (
                      <LikeButton
                        targetType="submission"
                        targetId={item.id}
                        initialCount={item.like_count}
                        size="sm"
                      />
                    )}
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {item.comment_count}
                    </span>
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </Masonry>
      )}
    </div>
  );
}
