'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from '@/components/charts';
import { BRAND_COLORS } from '@/lib/brand-colors';

interface AnalyticsKpiCardProps {
  label: string;
  value: number | string;
  previousValue?: number;
  icon: LucideIcon;
  trend?: Array<{ value: number }>;
  format?: 'number' | 'percent' | 'duration';
}

function formatValue(val: number | string, format?: string): string {
  if (typeof val === 'string') return val;
  if (format === 'percent') return `${val}%`;
  if (format === 'duration') {
    if (val < 60) return `${val}秒`;
    if (val < 3600) return `${Math.round(val / 60)}分钟`;
    return `${(val / 3600).toFixed(1)}小时`;
  }
  return val.toLocaleString('zh-CN');
}

export function AnalyticsKpiCard({ label, value, previousValue, icon: Icon, trend, format }: AnalyticsKpiCardProps) {
  const numValue = typeof value === 'number' ? value : 0;
  const change = previousValue && previousValue > 0
    ? ((numValue - previousValue) / previousValue) * 100
    : null;
  const isPositive = change !== null && change >= 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{formatValue(value, format)}</span>
        {change !== null && (
          <span className={cn('flex items-center gap-0.5 text-xs font-medium pb-0.5',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {previousValue !== undefined && (
        <p className="text-[11px] text-muted-foreground">vs 上期: {formatValue(previousValue, format)}</p>
      )}
      {trend && trend.length > 1 && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_COLORS.dark.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={BRAND_COLORS.dark.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={BRAND_COLORS.dark.primary} fill="url(#sparkGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
