'use client';

import { m } from 'framer-motion';
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
 * 能量槽组件
 * 
 * 用于展示 Workshop 参与进度，类似游戏中的能量条
 * - 支持动画效果
 * - 支持 prefers-reduced-motion
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

      {/* 能量格子 */}
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, index) => {
          const isFilled = index < current;
          const isLast = index === total - 1;

          return (
            <m.div
              key={index}
              className={cn(
                'relative rounded-md flex items-center justify-center transition-colors',
                sizeConfig.cell,
                isFilled
                  ? isComplete && isLast
                    ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                    : 'bg-gradient-to-br from-primary to-primary/80'
                  : 'bg-muted border border-muted-foreground/20'
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: index * 0.05,
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
            >
              {isFilled && (
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: index * 0.05 + 0.1,
                    type: 'spring',
                    stiffness: 500,
                    damping: 20,
                  }}
                >
                  {isComplete && isLast ? (
                    <Check className={cn('text-white', sizeConfig.icon)} />
                  ) : (
                    <Zap className={cn('text-white', sizeConfig.icon)} />
                  )}
                </m.div>
              )}
            </m.div>
          );
        })}
      </div>

      {/* 进度条背景 */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <m.div
          className={cn(
            'h-full rounded-full',
            isComplete
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
              : 'bg-gradient-to-r from-primary to-primary/80'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {isComplete && (
        <m.p
          className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          🎉 恭喜完成所有 Workshop！
        </m.p>
      )}
    </div>
  );
}
