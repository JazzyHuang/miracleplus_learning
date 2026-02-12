'use client';

import { useState, useEffect, Suspense } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, SearchInput } from '@/components/common';
import { ToolGrid, CategoryFilter, CategoryFilterSkeleton } from '@/components/ai-tools';
import { Button } from '@/components/ui/button';
import { createAIToolsService } from '@/lib/ai-tools';
import type { AITool, ToolCategory } from '@/types/database';

const PAGE_SIZE = 12;

interface AIToolsContentProps {
  searchQuery?: string;
  categorySlug?: string;
  initialCategories?: ToolCategory[];
  initialTools?: AITool[];
}

/**
 * AI 工具列表内容组件
 * 接收服务端预取的 initialCategories/initialTools，避免客户端瀑布式加载
 */
export function AIToolsContent({
  searchQuery,
  categorySlug,
  initialCategories,
  initialTools,
}: AIToolsContentProps) {
  const hasInitialData = !!initialCategories && !!initialTools;
  const [categories, setCategories] = useState<ToolCategory[]>(initialCategories ?? []);
  const [tools, setTools] = useState<AITool[]>(initialTools ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [totalCount, setTotalCount] = useState(initialTools?.length ?? 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (categorySlug && initialCategories) {
      const cat = initialCategories.find((c) => c.slug === categorySlug);
      return cat?.id ?? null;
    }
    return null;
  });

  // 仅在没有初始数据时从客户端加载（降级路径）
  useEffect(() => {
    if (hasInitialData) return;

    const fetchData = async () => {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);

      const [categoriesData, toolsResult] = await Promise.all([
        aiToolsService.getCategories(),
        aiToolsService.getTools({ search: searchQuery, limit: PAGE_SIZE }),
      ]);

      setCategories(categoriesData);
      setTools(toolsResult.tools);
      setTotalCount(toolsResult.total ?? toolsResult.tools.length);

      if (categorySlug && categoriesData.length > 0) {
        const category = categoriesData.find((c) => c.slug === categorySlug);
        if (category) setSelectedCategory(category.id);
      }

      setLoading(false);
    };

    fetchData();
  }, [searchQuery, categorySlug, hasInitialData]);

  // 切换分类时重新加载工具
  useEffect(() => {
    if (loading) return;

    const fetchTools = async () => {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);

      const result = await aiToolsService.getTools({
        categoryId: selectedCategory || undefined,
        search: searchQuery,
        limit: PAGE_SIZE,
      });

      setTools(result.tools);
      setTotalCount(result.total ?? result.tools.length);
    };

    fetchTools();
  }, [selectedCategory, searchQuery, loading]);

  // 过滤工具（客户端搜索）
  const filteredTools = searchQuery
    ? tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tools;

  // 加载更多
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);
      const result = await aiToolsService.getTools({
        categoryId: selectedCategory || undefined,
        search: searchQuery,
        limit: PAGE_SIZE,
        offset: tools.length,
      });
      setTools(prev => [...prev, ...result.tools]);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = tools.length < totalCount;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 头部 */}
      <PageHeader
        icon={Sparkles}
        title="AI 体验台"
        description="探索 AI 工具，分享使用心得，发现更多可能"
      />

      {/* 搜索 */}
      <div className="mb-6">
        <Suspense fallback={<div className="h-12 bg-muted rounded-lg animate-pulse max-w-md" />}>
          <SearchInput placeholder="搜索 AI 工具..." />
        </Suspense>
      </div>

      {/* 分类筛选 */}
      <div className="mb-8">
        {loading ? (
          <CategoryFilterSkeleton />
        ) : (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        )}
      </div>

      {/* 工具网格 */}
      <ToolGrid
        tools={filteredTools}
        loading={loading}
        emptyMessage={
          searchQuery
            ? `没有找到与"${searchQuery}"相关的工具`
            : undefined
        }
      />

      {/* 底部提示 / 加载更多 */}
      {!loading && filteredTools.length > 0 && (
        <div className="mt-12 text-center space-y-3">
          {hasMore && !searchQuery ? (
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />加载中...</>
              ) : (
                <>加载更多（还有 {totalCount - tools.length} 款工具）</>
              )}
            </Button>
          ) : (
            <p className="text-muted-foreground">
              共 {filteredTools.length} 款 AI 工具
            </p>
          )}
        </div>
      )}
    </div>
  );
}
