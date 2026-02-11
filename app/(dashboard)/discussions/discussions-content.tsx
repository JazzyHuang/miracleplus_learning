'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus, TrendingUp, Clock, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common';
import { DiscussionCard, DiscussionCardSkeleton, DiscussionForm } from '@/components/community';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { createDiscussionsService } from '@/lib/community';
import type { Discussion } from '@/types/database';

type SortBy = 'latest' | 'popular' | 'trending';

interface DiscussionsContentProps {
  initialDiscussions?: Discussion[];
  initialTags?: string[];
}

/**
 * Discussions Content - Resend inspired inbox design
 */
export function DiscussionsContent({
  initialDiscussions = [],
  initialTags = [],
}: DiscussionsContentProps) {
  const { user } = useUser();
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const [popularTags, setPopularTags] = useState<string[]>(initialTags);
  const [loading, setLoading] = useState(initialDiscussions.length === 0);
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const isInitialRender = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const discussionsService = createDiscussionsService(supabase);

      const [discussionsResult, tags] = await Promise.all([
        discussionsService.getDiscussions({
          sortBy,
          tag: selectedTag || undefined,
          limit: 30,
        }),
        discussionsService.getPopularTags(),
      ]);

      setDiscussions(discussionsResult.discussions);
      setPopularTags(tags);
    } catch (err) {
      console.error('讨论列表加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedTag]);

  useEffect(() => {
    if (isInitialRender.current && initialDiscussions.length > 0) {
      isInitialRender.current = false;
      return;
    }
    isInitialRender.current = false;
    fetchData();
  }, [sortBy, selectedTag, fetchData, initialDiscussions.length]);

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const sortOptions = [
    { id: 'latest', label: '最新', icon: Clock },
    { id: 'popular', label: '热门', icon: MessageSquare },
    { id: 'trending', label: '热议', icon: TrendingUp },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 animate-fade-up"
      >
        <PageHeader
          icon={MessageSquare}
          title="讨论区"
          description="与社区成员交流，分享你的想法"
        />
        {user && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            发起讨论
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        className="flex flex-col md:flex-row md:items-center gap-4 animate-fade-up animate-delay-100"
      >
        {/* Sort tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border/50 shadow-sm">
          {sortOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSortBy(option.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === option.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <option.icon className="w-3.5 h-3.5" />
              {option.label}
            </button>
          ))}
        </div>

        {/* Tags */}
        {popularTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'secondary'}
                className="cursor-pointer transition-all hover:border-white/20"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Discussion List - Inbox style */}
      <div
        className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden animate-fade-up animate-delay-200"
      >
        {loading ? (
          <div className="divide-y divide-border/30">
            {Array.from({ length: 5 }).map((_, i) => (
              <DiscussionCardSkeleton key={i} />
            ))}
          </div>
        ) : discussions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Inbox}
              title={selectedTag ? `没有"${selectedTag}"相关的讨论` : '暂无讨论'}
              description={
                selectedTag
                  ? '尝试选择其他标签'
                  : user
                  ? '成为第一个发起讨论的人吧！'
                  : '登录后可以发起讨论'
              }
              action={
                user && !selectedTag ? {
                  label: '发起讨论',
                  onClick: () => setShowForm(true)
                } : undefined
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {discussions.map((discussion) => (
              <div
                key={discussion.id}
                className="cv-list-item"
              >
                <DiscussionCard discussion={discussion} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {!loading && discussions.length > 0 && (
        <div
          className="text-center text-sm text-foreground/40 animate-fade-up animate-delay-300"
        >
          共 {discussions.length} 个话题
        </div>
      )}

      {/* Create form dialog */}
      <DiscussionForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
