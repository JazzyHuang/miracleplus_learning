import { useMemo } from 'react';

/**
 * 通用过滤 Hook
 * 根据查询字符串过滤数组项
 * 
 * @param items - 要过滤的数组
 * @param query - 搜索查询字符串
 * @param fields - 要搜索的字段名数组
 * @returns 过滤后的数组
 * 
 * @example
 * const filteredCourses = useFilter(courses, searchQuery, ['title', 'description']);
 * 
 * Phase 1 修复：使用 fields.join(',') 稳定依赖项，避免数组引用变化导致的不必要重新计算
 */
export function useFilter<T extends object>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  // 使用 join 将 fields 转为字符串，稳定依赖项
  const fieldsKey = fields.join(',');
  
  return useMemo(() => {
    // 添加空值检查
    if (!items || items.length === 0) {
      return [];
    }
    
    if (!query || !query.trim()) {
      return items;
    }

    const lowerQuery = query.toLowerCase().trim();

    return items.filter((item) =>
      fields.some((field) => {
        const value = item[field];
        // 添加 null/undefined 检查
        if (value == null) {
          return false;
        }
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerQuery);
        }
        if (typeof value === 'number') {
          return value.toString().includes(lowerQuery);
        }
        return false;
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, fieldsKey]);
}

/**
 * 计算动画延迟时间
 * 用于列表项的渐进式动画
 * 
 * @param index - 项目索引
 * @param baseDelay - 基础延迟时间（毫秒），默认 50
 * @param maxDelay - 最大延迟时间（毫秒），默认 500
 * @returns 延迟时间字符串，如 '150ms'
 */
export function getAnimationDelay(
  index: number,
  baseDelay = 50,
  maxDelay = 500
): string {
  const delay = Math.min(index * baseDelay, maxDelay);
  return `${delay}ms`;
}
