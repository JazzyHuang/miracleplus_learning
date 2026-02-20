'use client';

import { useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Search,
  LogOut,
  Command,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';
import { useSidebar } from '@/components/sidebar/sidebar-context';
import { createClient } from '@/lib/supabase/client';
import { createSearchService, getTypeLabel, type SearchResult } from '@/lib/search/service';
import { navGroups } from '@/components/sidebar/nav-config';
import { BookOpen, Bot, MessageSquare, User, Settings } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
}

interface CommandGroup {
  id: string;
  label: string;
  commands: CommandItem[];
}

const RECENT_KEY = 'ml-command-palette-recent';

/**
 * Command Palette — Linear/Raycast inspired Cmd+K menu
 *
 * Desktop: centered modal at 15vh from top, 540px wide, glassmorphism
 * Mobile: bottom drawer, full width, rounded top corners
 */
export function CommandPalette() {
  const router = useRouter();
  const { user, signOut } = useUser();
  const { collapsed } = useSidebar();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [contentResults, setContentResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  // Portal mount target — ensures fixed positioning is always relative to viewport
  const portalTarget = useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  );
  // Recent commands from localStorage
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Debounced content search (300ms)
  useEffect(() => {
    if (!search || search.length < 2) {
      // Use timeout to avoid synchronous setState in effect
      const id = setTimeout(() => {
        setContentResults([]);
        setSearching(false);
      }, 0);
      return () => clearTimeout(id);
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const service = createSearchService(supabase);
      const results = await service.search(search, undefined, 8);
      setContentResults(results);
      setSearching(false);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close helper
  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
    setContentResults([]);
  }, []);

  // Navigation commands — 从共享配置生成
  const navCommands: CommandItem[] = useMemo(() =>
    navGroups.flatMap(g => g.items).map(item => ({
      id: item.href.slice(1) || 'home',
      label: item.label,
      description: `前往${item.label}`,
      icon: item.icon,
      action: () => router.push(item.href),
      keywords: item.keywords ?? [],
    })),
    [router]
  );

  // Account commands — 硬编码（不再从 nav-config 导入）
  const accountCommands: CommandItem[] = useMemo(() => [
    {
      id: 'profile', label: '个人资料', description: '前往个人资料', icon: User,
      action: () => router.push('/profile'),
      keywords: ['profile', 'account', '个人', '资料'],
    },
    {
      id: 'settings', label: '设置', description: '前往设置', icon: Settings,
      action: () => router.push('/settings'),
      keywords: ['settings', '设置'],
    },
    ...(user ? [{
      id: 'logout', label: '退出登录', description: '退出当前账号', icon: LogOut,
      action: async () => { await signOut(); router.push('/login'); },
      keywords: ['logout', 'signout', '退出', '登出'],
    }] : []),
  ], [router, user, signOut]);

  const allCommands = useMemo(() => [...navCommands, ...accountCommands], [navCommands, accountCommands]);

  // Build grouped commands (with recent items when not searching)
  const commandGroups: CommandGroup[] = useMemo(() => {
    if (!search) {
      const groups: CommandGroup[] = [];
      if (recentIds.length > 0) {
        const recentCmds = recentIds
          .map(id => allCommands.find(c => c.id === id))
          .filter((c): c is CommandItem => c != null);
        if (recentCmds.length > 0) {
          groups.push({ id: 'recent', label: '最近', commands: recentCmds });
        }
      }
      groups.push({ id: 'nav', label: '导航', commands: navCommands });
      groups.push({ id: 'account', label: '账户', commands: accountCommands });
      return groups;
    }
    const lowerSearch = search.toLowerCase();
    const filtered = allCommands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerSearch);
      const matchDesc = cmd.description?.toLowerCase().includes(lowerSearch);
      const matchKw = cmd.keywords?.some((k) => k.toLowerCase().includes(lowerSearch));
      return matchLabel || matchDesc || matchKw;
    });
    const groups: CommandGroup[] = [];
    if (filtered.length > 0) {
      groups.push({ id: 'results', label: '快捷导航', commands: filtered });
    }
    // 内容搜索结果
    if (contentResults.length > 0) {
      const contentCommands: CommandItem[] = contentResults.map((r) => ({
        id: `content-${r.resultId}`,
        label: r.title,
        description: `${getTypeLabel(r.resultType)} · ${r.snippet?.slice(0, 60) || ''}`,
        icon: r.resultType === 'course' ? BookOpen : r.resultType === 'ai_tool' ? Bot : r.resultType === 'discussion' ? MessageSquare : BookOpen,
        action: () => router.push(r.url),
        keywords: [],
      }));
      groups.push({ id: 'content', label: '内容搜索', commands: contentCommands });
    } else if (searching) {
      // Show a placeholder group while searching
      groups.push({ id: 'content', label: '内容搜索', commands: [
        { id: 'searching', label: '搜索中...', icon: Search, action: () => {}, keywords: [] },
      ] });
    }
    return groups;
  }, [search, recentIds, allCommands, navCommands, accountCommands, contentResults, searching, router]);

  // Flat list for keyboard navigation
  const flatCommands = useMemo(() => commandGroups.flatMap(g => g.commands), [commandGroups]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  // Handle command selection + record recent
  const handleSelect = useCallback((command: CommandItem) => {
    close();
    const updated = [command.id, ...recentIds.filter(id => id !== command.id)].slice(0, 5);
    setRecentIds(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    command.action();
  }, [close, recentIds]);

  // Keyboard navigation
  const handleKeyNavigation = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = flatCommands[selectedIndex];
      if (cmd) handleSelect(cmd);
    }
  }, [flatCommands, selectedIndex, handleSelect]);

  // Pre-compute group start indices for selectedIndex mapping
  const groupStartIndices = useMemo(() => {
    const indices: number[] = [];
    let acc = 0;
    for (const group of commandGroups) {
      indices.push(acc);
      acc += group.commands.length;
    }
    return indices;
  }, [commandGroups]);

  // Render via portal to document.body — guarantees fixed positioning
  // is always relative to the viewport, regardless of ancestor CSS
  // (transform, contain, backdrop-filter, etc. can break fixed positioning)
  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={close}
          />

          {/* Command palette — centered on content area (offset by sidebar width on desktop) */}
          <div
            className={cn(
              "fixed z-50 inset-x-0 top-0 sm:top-[15vh] pointer-events-none",
              collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
            )}
          >
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="命令面板"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="pointer-events-auto mx-auto w-full sm:w-[540px] sm:max-w-[calc(100vw-2rem)]"
            >
            <div className={cn(
              'bg-popover/95 backdrop-blur-xl overflow-hidden',
              'border-t sm:border border-border/50',
              'rounded-t-2xl sm:rounded-xl',
              'shadow-theme-lg'
            )}>
              {/* Mobile drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30">
                <Search className="w-5 h-5 text-muted-foreground/50 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="输入命令或搜索..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleKeyNavigation}
                  className="flex-1 bg-transparent text-popover-foreground placeholder:text-muted-foreground/40 outline-none text-[15px]"
                  autoFocus
                  aria-label="搜索命令"
                  role="combobox"
                  aria-expanded={flatCommands.length > 0}
                  aria-autocomplete="list"
                  aria-controls="command-palette-listbox"
                  aria-activedescendant={flatCommands[selectedIndex] ? `command-${flatCommands[selectedIndex].id}` : undefined}
                />
                <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] bg-muted/50 text-muted-foreground/60 rounded border border-border/30">
                  ESC
                </kbd>
              </div>

              {/* Commands list */}
              <div id="command-palette-listbox" role="listbox" aria-label="命令列表" className="max-h-[70vh] sm:max-h-80 overflow-y-auto py-1.5">
                {commandGroups.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">没有找到匹配的命令</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">试试输入页面名称或功能关键词</p>
                  </div>
                ) : (
                  commandGroups.map((group, groupIdx) => {
                    const groupStartIndex = groupStartIndices[groupIdx] ?? 0;
                    return (
                      <div key={group.id}>
                        <div className="px-4 py-2 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider select-none">
                          {group.label}
                        </div>
                        {group.commands.map((command, i) => {
                          const globalIndex = groupStartIndex + i;
                          const isSelected = globalIndex === selectedIndex;
                          return (
                            <button
                              key={`${group.id}-${command.id}`}
                              id={`command-${command.id}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleSelect(command)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                'relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150',
                                isSelected ? 'bg-primary/[0.08]' : 'hover:bg-accent/80'
                              )}
                            >
                              {isSelected && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                              )}
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150',
                                isSelected ? 'bg-primary/15' : 'bg-muted/40'
                              )}>
                                <command.icon className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', isSelected ? 'text-foreground' : 'text-foreground/80')}>
                                  {command.label}
                                </p>
                                {command.description && (
                                  <p className="text-xs text-muted-foreground/60 truncate">{command.description}</p>
                                )}
                              </div>
                              {isSelected && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/30">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 bg-muted/40 rounded text-[10px]">↑</kbd>
                    <kbd className="px-1 bg-muted/40 rounded text-[10px]">↓</kbd>
                    <span>导航</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 bg-muted/40 rounded text-[10px]">↵</kbd>
                    <span>选择</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 bg-muted/40 rounded text-[10px]">esc</kbd>
                    <span>关闭</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/40">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              </div>
            </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (!portalTarget) return null;
  return createPortal(content, portalTarget);
}
