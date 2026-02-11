'use client';

import { User, Shield, Bell, BookOpen, Eye, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettingsSection } from '@/app/(dashboard)/settings/settings-content';

const NAV_ITEMS: { key: SettingsSection; label: string; icon: typeof User }[] = [
  { key: 'profile', label: '个人资料', icon: User },
  { key: 'security', label: '账户安全', icon: Shield },
  { key: 'notifications', label: '通知偏好', icon: Bell },
  { key: 'learning', label: '学习偏好', icon: BookOpen },
  { key: 'privacy', label: '隐私设置', icon: Eye },
  { key: 'data', label: '数据管理', icon: Database },
];

interface SettingsNavProps {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
}

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <>
      {/* Mobile: horizontal scrollable tabs */}
      <div className="lg:hidden overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 p-1 rounded-xl bg-card border border-border/50 w-fit">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                active === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: vertical sidebar nav */}
      <nav className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-6 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all',
                active === item.key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
