'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, SearchInput } from '@/components/common';
import { ToolGrid, CategoryFilter, CategoryFilterSkeleton } from '@/components/ai-tools';
import { createAIToolsService } from '@/lib/ai-tools';
import type { AITool, ToolCategory } from '@/types/database';

interface AIToolsContentProps {
  searchQuery?: string;
  categorySlug?: string;
}

/**
 * AI 工具列表内容组件
 */
export function AIToolsContent({ searchQuery, categorySlug }: AIToolsContentProps) {
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 初始化加载数据
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);

      // 并行获取分类和工具
      const [categoriesData, toolsResult] = await Promise.all([
        aiToolsService.getCategories(),
        aiToolsService.getTools({
          search: searchQuery,
          limit: 50,
        }),
      ]);

      setCategories(categoriesData);
      setTools(toolsResult.tools);

      // 如果 URL 有 category 参数，找到对应的分类 ID
      if (categorySlug && categoriesData.length > 0) {
        const category = categoriesData.find((c) => c.slug === categorySlug);
        if (category) {
          setSelectedCategory(category.id);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [searchQuery, categorySlug]);

  // 切换分类时重新加载工具
  useEffect(() => {
    if (loading) return;

    const fetchTools = async () => {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);

      const result = await aiToolsService.getTools({
        categoryId: selectedCategory || undefined,
        search: searchQuery,
        limit: 50,
      });

      setTools(result.tools);
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

      {/* 底部提示 */}
      {!loading && filteredTools.length > 0 && (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            共 {filteredTools.length} 款 AI 工具
          </p>
        </div>
      )}
    </div>
  );
}
