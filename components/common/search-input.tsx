'use client';

import { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** 搜索框占位文本 */
  placeholder?: string;
  /** URL 搜索参数名，默认 'q' */
  searchParam?: string;
  /** 自定义类名 */
  className?: string;
  /** 输入框高度类名 */
  inputClassName?: string;
  /** 防抖延迟（毫秒），默认 300ms */
  debounceMs?: number;
}

/**
 * 通用搜索输入组件
 * 自动同步搜索词到 URL 参数
 * 
 * Phase 4 改进：添加防抖功能，避免频繁的 URL 更新
 */
export function SearchInput({
  placeholder = '搜索...',
  searchParam = 'q',
  className,
  inputClassName,
  debounceMs = 300,
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get(searchParam) || '');
  
  // Phase 4: 防抖定时器
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Phase 4: 带防抖的 URL 更新
  const updateUrl = useCallback((term: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (term) {
        params.set(searchParam, term);
      } else {
        params.delete(searchParam);
      }
      router.replace(`?${params.toString()}`);
    });
  }, [router, searchParams, searchParam]);

  const handleSearch = useCallback((term: string) => {
    setValue(term);
    
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      updateUrl(term);
    }, debounceMs);
  }, [updateUrl, debounceMs]);

  return (
    <div className={cn('relative max-w-md', className)}>
      <Search 
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" 
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        className={cn('pl-10 h-12', inputClassName)}
        aria-label={placeholder}
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
