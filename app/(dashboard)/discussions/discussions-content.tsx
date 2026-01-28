'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, TrendingUp, Clock, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common';
import { DiscussionCard, DiscussionCardSkeleton, DiscussionForm } from '@/components/community';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { createDiscussionsService } from '@/lib/community';
import { cn } from '@/lib/utils';
import type { Discussion } from '@/types/database';

type SortBy = 'latest' | 'popular' | 'trending';

/**
 * 讨论区内容组件
 */
export function DiscussionsContent() {
  const { user } = useUser();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 加载数据
  const fetchData = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [sortBy, selectedTag]);

  const handleSortChange = (value: string) => {
    setSortBy(value as SortBy);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <PageHeader
          icon={MessageSquare}
          title="讨论区"
          description="与社区成员交流，分享你的想法"
        />
        {user && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            发起讨论
          </Button>
        )}
      </div>

      {/* 排序标签 */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <Tabs value={sortBy} onValueChange={handleSortChange}>
          <TabsList>
            <TabsTrigger value="latest" className="gap-1">
              <Clock className="w-4 h-4" />
              最新
            </TabsTrigger>
            <TabsTrigger value="popular" className="gap-1">
              <MessageSquare className="w-4 h-4" />
              热门
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-1">
              <TrendingUp className="w-4 h-4" />
              热议
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 热门标签 */}
        {popularTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 讨论列表 */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <DiscussionCardSkeleton key={i} />
          ))}
        </div>
      ) : discussions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={selectedTag ? `没有"${selectedTag}"相关的讨论` : '暂无讨论'}
          description={
            selectedTag
              ? '尝试选择其他标签'
              : user
              ? '成为第一个发起讨论的人吧！'
              : '登录后可以发起讨论'
          }
          action={
            user && !selectedTag ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                发起讨论
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion, index) => (
            <div
              key={discussion.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <DiscussionCard discussion={discussion} />
            </div>
          ))}
        </div>
      )}

      {/* 底部统计 */}
      {!loading && discussions.length > 0 && (
        <div className="mt-8 text-center text-muted-foreground">
          共 {discussions.length} 个话题
        </div>
      )}

      {/* 发布表单 */}
      <DiscussionForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
