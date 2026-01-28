'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

/**
 * 侧边栏状态 Provider
 * 
 * Phase 5 改进：状态持久化到 localStorage
 * 
 * Hydration 修复：
 * 1. 使用一致的默认值初始化 useState（避免 SSR/CSR 不匹配）
 * 2. 在 useEffect 中从 localStorage 恢复状态（仅在客户端挂载后）
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // 使用一致的默认值初始化，避免 hydration mismatch
  const [collapsed, setCollapsedState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 挂载后从 localStorage 恢复状态
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') {
        setCollapsedState(true);
      }
    } catch {
      // localStorage 读取失败，忽略
    }
    setIsHydrated(true);
  }, []);

  // 状态变化后保存到 localStorage（仅在 hydration 完成后）
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // localStorage 写入失败，忽略
    }
  }, [collapsed, isHydrated]);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggle,
      }}
    >
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
