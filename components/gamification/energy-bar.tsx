'use client';

import { Zap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnergyBarProps {
  /** 当前完成数 */
  current: number;
  /** 总数（默认为 6，对应 6 期 Workshop） */
  total?: number;
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 能量槽组件 — CSS 动画版
 * 
 * 优化：
 * - m.div spring 动画 → CSS animate-scale-in + animation-delay
 * - 进度条 → CSS transition
 * - 零 Framer Motion JS 开销
 */
export function EnergyBar({
  current,
  total = 6,
  showLabel = true,
  className,
  size = 'md',
}: EnergyBarProps) {
  const progress = Math.min((current / total) * 100, 100);
  const isComplete = current >= total;

  const sizeClasses = {
    sm: {
      container: 'h-6',
      cell: 'w-6 h-6',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      container: 'h-8',
      cell: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    lg: {
      container: 'h-10',
      cell: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
  };

  const sizeConfig = sizeClasses[size];

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={cn('font-medium', sizeConfig.text)}>
            Workshop 能量
          </span>
          <span className={cn('text-muted-foreground', sizeConfig.text)}>
            {current}/{total}
          </span>
        </div>
      )}

      {/* 能量格子 — CSS scale-in + stagger delay */}
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, index) => {
          const isFilled = index < current;
          const isLast = index === total - 1;

          return (
            <div
              key={index}
              className={cn(
                'relative rounded-md flex items-center justify-center transition-colors animate-scale-in',
                sizeConfig.cell,
                isFilled
                  ? isComplete && isLast
                    ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                    : 'bg-gradient-to-br from-primary to-primary/80'
                  : 'bg-muted border border-muted-foreground/20'
              )}
              style={{
                '--animation-delay': `${index * 50}ms`,
              } as React.CSSProperties}
            >
              {isFilled && (
                <div
                  className="animate-scale-in"
                  style={{
                    '--animation-delay': `${index * 50 + 100}ms`,
                  } as React.CSSProperties}
                >
                  {isComplete && isLast ? (
                    <Check className={cn('text-white', sizeConfig.icon)} />
                  ) : (
                    <Zap className={cn('text-white', sizeConfig.icon)} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 进度条 — CSS transition */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            isComplete
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
              : 'bg-gradient-to-r from-primary to-primary/80'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isComplete && (
        <p
          className="text-xs text-warning text-center font-medium animate-fade-up"
          style={{ '--animation-delay': '0.5s' } as React.CSSProperties}
        >
          🎉 恭喜完成所有 Workshop！
        </p>
      )}
    </div>
  );
}
