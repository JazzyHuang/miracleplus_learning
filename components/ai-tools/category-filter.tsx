'use client';

import { m } from 'framer-motion';
import {
  MessageSquare,
  Image,
  Code,
  BarChart,
  Video,
  Zap,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToolCategory } from '@/types/database';

interface CategoryFilterProps {
  categories: ToolCategory[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Image,
  Code,
  BarChart,
  Video,
  Zap,
  Sparkles,
};

/**
 * 工具分类筛选组件
 */
export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* 全部 */}
      <Button
        variant={selectedCategory === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onCategoryChange(null)}
        className="relative"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        全部
        {selectedCategory === null && (
          <m.div
            layoutId="category-indicator"
            className="absolute inset-0 bg-primary rounded-md -z-10"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
          />
        )}
      </Button>

      {/* 分类按钮 */}
      {categories.map((category) => {
        const Icon = iconMap[category.icon || 'Sparkles'] || Sparkles;
        const isSelected = selectedCategory === category.id;

        return (
          <Button
            key={category.id}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className="relative"
          >
            <Icon className="w-4 h-4 mr-2" />
            {category.name}
            {isSelected && (
              <m.div
                layoutId="category-indicator"
                className="absolute inset-0 bg-primary rounded-md -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              />
            )}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * 分类筛选骨架屏
 */
export function CategoryFilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-9 w-24 bg-muted rounded-md animate-pulse"
        />
      ))}
    </div>
  );
}
