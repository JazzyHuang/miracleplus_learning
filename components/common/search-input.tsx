'use client';

import { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEARCH_HISTORY_KEY = 'ml-search-history';
const MAX_HISTORY = 5;

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
  /** 搜索历史的 localStorage key 后缀 */
  historyKey?: string;
}

/**
 * Search Input - 增强版搜索
 * 
 * 新功能：
 * - 搜索历史记录（localStorage）
 * - 下拉建议面板
 * - 清除按钮
 * - 键盘导航支持
 */
export function SearchInput({
  placeholder = '搜索...',
  searchParam = 'q',
  className,
  inputClassName,
  debounceMs = 300,
  historyKey = '',
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get(searchParam) || '');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const storageKey = `${SEARCH_HISTORY_KEY}${historyKey ? `-${historyKey}` : ''}`;

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore parsing errors
    }
  }, [storageKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const saveToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    try {
      const stored = localStorage.getItem(storageKey);
      const existing: string[] = stored ? JSON.parse(stored) : [];
      const updated = [term, ...existing.filter(h => h !== term)].slice(0, MAX_HISTORY);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setHistory(updated);
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  const removeFromHistory = useCallback((term: string) => {
    try {
      const updated = history.filter(h => h !== term);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setHistory(updated);
    } catch {
      // Ignore storage errors
    }
  }, [history, storageKey]);

  // 性能优化：使用 ref 读取最新 searchParams，避免回调链级联重建
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  });

  const updateUrl = useCallback((term: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParamsRef.current);
      if (term) {
        params.set(searchParam, term);
      } else {
        params.delete(searchParam);
      }
      router.replace(`?${params.toString()}`);
    });
  }, [router, searchParam]);

  const handleSearch = useCallback((term: string) => {
    setValue(term);
    setSelectedIndex(-1);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      updateUrl(term);
      if (term.trim()) {
        saveToHistory(term.trim());
      }
    }, debounceMs);
  }, [updateUrl, debounceMs, saveToHistory]);

  const selectHistoryItem = useCallback((term: string) => {
    setValue(term);
    updateUrl(term);
    setShowHistory(false);
    inputRef.current?.blur();
  }, [updateUrl]);

  const clearSearch = useCallback(() => {
    setValue('');
    updateUrl('');
    inputRef.current?.focus();
  }, [updateUrl]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showHistory || history.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % history.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + history.length) % history.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selectedItem = history[selectedIndex];
      if (selectedItem) {
        selectHistoryItem(selectedItem);
      }
    } else if (e.key === 'Escape') {
      setShowHistory(false);
    }
  }, [showHistory, history, selectedIndex, selectHistoryItem]);

  const filteredHistory = value.trim()
    ? history.filter(h => h.toLowerCase().includes(value.toLowerCase()) && h !== value)
    : history;

  return (
    <div ref={containerRef} className={cn('relative max-w-md', className)}>
      <Search 
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" 
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setShowHistory(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-11 pl-10 pr-10 rounded-xl',
          'bg-card text-card-foreground',
          'placeholder:text-muted-foreground/50',
          'border border-border/50',
          'outline-none transition-all duration-200 shadow-sm',
          'focus:border-primary/30 focus:shadow-md',
          'focus:ring-1 focus:ring-primary/20',
          inputClassName
        )}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={showHistory && filteredHistory.length > 0}
        aria-controls={showHistory && filteredHistory.length > 0 ? 'search-history-list' : undefined}
        aria-autocomplete="list"
      />
      
      {/* Clear / Loading indicator */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
        {isPending ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" aria-hidden="true" />
        ) : value ? (
          <button
            onClick={clearSearch}
            className="p-0.5 rounded text-muted-foreground hover:text-card-foreground transition-colors"
            aria-label="清除搜索"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Search history dropdown */}
      {showHistory && filteredHistory.length > 0 && (
        <div
          id="search-history-list"
          className="absolute top-full left-0 right-0 mt-1.5 py-1.5 rounded-xl bg-popover border border-border shadow-elevated z-50 animate-fade-in"
          role="listbox"
        >
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">搜索历史</div>
          {filteredHistory.map((item, index) => (
            <div
              key={item}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors',
                index === selectedIndex ? 'bg-muted/60' : 'hover:bg-muted/30'
              )}
              onClick={() => selectHistoryItem(item)}
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-popover-foreground truncate flex-1">{item}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromHistory(item);
                }}
                className="p-0.5 rounded text-muted-foreground hover:text-popover-foreground transition-colors shrink-0"
                aria-label={`删除搜索记录: ${item}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
