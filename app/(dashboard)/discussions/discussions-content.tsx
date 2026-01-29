'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus, TrendingUp, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common';
import { DiscussionCard, DiscussionCardSkeleton, DiscussionForm } from '@/components/community';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { createDiscussionsService } from '@/lib/community';
import type { Discussion } from '@/types/database';

type SortBy = 'latest' | 'popular' | 'trending';

interface DiscussionsContentProps {
  initialDiscussions?: Discussion[];
  initialTags?: string[];
}

/**
 * 讨论区内容组件
 * 支持服务端预获取数据
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
  
  // 追踪是否为初始渲染，用于决定是否跳过首次 fetch
  const isInitialRender = useRef(true);

  // 加载数据
  const fetchData = useCallback(async () => {
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
  }, [sortBy, selectedTag]);

  // 只在排序或标签变更时重新获取（初始数据已经在服务端获取）
  useEffect(() => {
    // 仅在首次渲染时跳过 fetch（如果有服务端预取的初始数据）
    // 使用 ref 确保只跳过一次，后续切换回 latest 仍会触发 fetch
    if (isInitialRender.current && initialDiscussions.length > 0) {
      isInitialRender.current = false;
      return;
    }
    isInitialRender.current = false;
    fetchData();
  }, [sortBy, selectedTag, fetchData, initialDiscussions.length]);

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
            user && !selectedTag ? {
              label: '发起讨论',
              onClick: () => setShowForm(true)
            } : undefined
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
