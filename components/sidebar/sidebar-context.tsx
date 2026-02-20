'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';
const SECTIONS_STORAGE_KEY = 'sidebar-sections';

// 默认全部折叠（路由变化时自动展开活跃分组）
const DEFAULT_SECTIONS: Record<string, boolean> = {
  learning: false,
  resources: false,
  community: false,
  growth: false,
};

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggle: () => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

/**
 * 侧边栏状态 Provider
 *
 * 管理两个持久化状态：
 * 1. collapsed — 侧边栏是否收起（icon-only 模式）
 * 2. expandedSections — 各分组的展开/折叠状态
 *
 * Hydration 修复：
 * 1. 使用一致的默认值初始化 useState（避免 SSR/CSR 不匹配）
 * 2. 在 useEffect 中从 localStorage 恢复状态（仅在客户端挂载后）
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // 使用一致的默认值初始化，避免 hydration mismatch
  const [collapsed, setCollapsedState] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(DEFAULT_SECTIONS);
  const [isHydrated, setIsHydrated] = useState(false);

  // 挂载后从 localStorage 恢复状态
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(STORAGE_KEY);
      if (savedCollapsed === 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsedState(true);
      }
    } catch {
      // localStorage 读取失败，忽略
    }

    try {
      const savedSections = localStorage.getItem(SECTIONS_STORAGE_KEY);
      if (savedSections) {
        const parsed = JSON.parse(savedSections);
        if (typeof parsed === 'object' && parsed !== null) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setExpandedSections({ ...DEFAULT_SECTIONS, ...parsed });
        }
      }
    } catch {
      // localStorage 读取失败，忽略
    }

    setIsHydrated(true);
  }, []);

  // collapsed 状态变化后保存到 localStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // localStorage 写入失败，忽略
    }
  }, [collapsed, isHydrated]);

  // expandedSections 状态变化后保存到 localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(expandedSections));
    } catch {
      // localStorage 写入失败，忽略
    }
  }, [expandedSections, isHydrated]);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => !prev);
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // 性能修复：使用 useMemo 记忆化 context value
  const contextValue = useMemo(() => ({
    collapsed,
    setCollapsed,
    toggle,
    expandedSections,
    toggleSection,
  }), [collapsed, setCollapsed, toggle, expandedSections, toggleSection]);

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
