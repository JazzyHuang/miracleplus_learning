'use client';

import { cn } from '@/lib/utils';

const options = [
  { value: 7, label: '7天' },
  { value: 14, label: '14天' },
  { value: 30, label: '30天' },
  { value: 90, label: '90天' },
] as const;

interface AnalyticsDateFilterProps {
  value: number;
  onChange: (days: number) => void;
}

export function AnalyticsDateFilter({ value, onChange }: AnalyticsDateFilterProps) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg border transition-colors',
            value === opt.value
              ? 'bg-foreground text-background border-foreground'
              : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
