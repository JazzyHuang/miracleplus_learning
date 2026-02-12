'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

/**
 * 全局键盘快捷键 hook
 * 在输入框内自动禁用
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 输入框内禁用
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((e.target as HTMLElement).isContentEditable) return;

    for (const s of shortcuts) {
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;

      if (keyMatch && ctrlMatch && shiftMatch) {
        e.preventDefault();
        s.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * 预定义的全局导航快捷键
 */
export function useGlobalShortcuts() {
  const router = useRouter();

  const shortcuts: Shortcut[] = [
    { key: '?', shift: true, action: () => {
      document.dispatchEvent(new CustomEvent('toggle-shortcuts-dialog'));
    }, description: '显示快捷键帮助' },
    { key: 'h', action: () => router.push('/dashboard'), description: '首页' },
    { key: 'c', action: () => router.push('/courses'), description: '课程' },
    { key: 'w', action: () => router.push('/workshop'), description: 'Workshop' },
    { key: 'd', action: () => router.push('/discussions'), description: '讨论' },
    { key: 'r', action: () => router.push('/review'), description: '每日复习' },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

export const SHORTCUT_LIST = [
  { keys: ['?'], description: '显示快捷键帮助' },
  { keys: ['H'], description: '首页' },
  { keys: ['C'], description: '课程' },
  { keys: ['W'], description: 'Workshop' },
  { keys: ['D'], description: '讨论' },
  { keys: ['R'], description: '每日复习' },
  { keys: ['⌘', 'K'], description: '命令面板' },
];
