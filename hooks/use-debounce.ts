'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce Hook
 * 
 * 延迟更新值，直到指定延迟时间内没有新的变化。
 * 适用于搜索输入、筛选器等需要减少频繁调用的场景。
 * 
 * @param value - 需要 debounce 的值
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns debounced 后的值
 * 
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 * 
 * useEffect(() => {
 *   if (debouncedSearch) fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
