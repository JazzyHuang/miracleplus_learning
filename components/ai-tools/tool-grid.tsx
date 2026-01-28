'use client';

import { ToolCard, ToolCardSkeleton } from './tool-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Sparkles } from 'lucide-react';
import type { AITool } from '@/types/database';

interface ToolGridProps {
  tools: AITool[];
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * AI 工具网格组件
 */
export function ToolGrid({ tools, loading = false, emptyMessage }: ToolGridProps) {
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ToolCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="暂无工具"
        description={emptyMessage || '该分类下暂无工具，稍后再来看看吧'}
      />
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tools.map((tool, index) => (
        <div
          key={tool.id}
          className="animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ToolCard tool={tool} featured={tool.is_featured} />
        </div>
      ))}
    </div>
  );
}
