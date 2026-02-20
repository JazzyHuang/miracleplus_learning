'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { NavGroup } from './nav-config';

function isNavActive(href: string, pathname: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

interface NavSectionProps {
  group: NavGroup;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
}

export function NavSection({ group, collapsed, expanded, onToggle, pathname }: NavSectionProps) {
  // 收起模式（icon-only）：跳过分组标题，直接渲染图标 + Tooltip
  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href} aria-current={active ? 'page' : undefined}>
                  <div
                    className={cn(
                      'relative flex items-center justify-center px-3 py-2.5 rounded-lg transition-all duration-200',
                      active
                        ? 'text-foreground'
                        : 'text-foreground/50 hover:text-foreground/80 hover:bg-accent'
                    )}
                  >
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.12] to-transparent rounded-xl border border-primary/[0.15]" />
                    )}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                    )}
                    <item.icon className={cn('w-[18px] h-[18px] shrink-0 relative z-10', active && 'text-foreground')} />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // 展开模式：分组标题 + 可折叠内容区
  return (
    <div>
      {/* 分组标题 */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-1 cursor-pointer group"
      >
        <span className="text-xs font-medium text-foreground/50 uppercase tracking-wider group-hover:text-foreground/70 transition-colors duration-200">
          {group.label}
        </span>
        <ChevronRight
          className="w-3 h-3 text-foreground/50 group-hover:text-foreground/70 transition-all duration-250 ease-sidebar"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* CSS Grid 动画容器 */}
      <div className="nav-section-content" data-expanded={expanded}>
        <div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavActive(item.href, pathname);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
                  <div
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      'hover:translate-x-0.5',
                      active
                        ? 'text-foreground'
                        : 'text-foreground/50 hover:text-foreground/80 hover:bg-accent'
                    )}
                  >
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.12] to-transparent rounded-xl border border-primary/[0.15] transition-all duration-200" />
                    )}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                    )}
                    <item.icon className={cn('w-[18px] h-[18px] shrink-0 relative z-10', active && 'text-foreground')} />
                    <span className="font-medium text-sm relative z-10">
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
