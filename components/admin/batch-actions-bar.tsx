'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 批量操作按钮配置
 */
export interface BatchAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  onClick: () => void | Promise<void>;
}

interface BatchActionsBarProps {
  selectedCount: number;
  actions: BatchAction[];
  onClear: () => void;
  className?: string;
}

/**
 * 批量操作栏组件
 *
 * 选中项目后显示在页面底部，提供批量操作功能
 *
 * @example
 * ```tsx
 * const batchActions = [
 *   {
 *     id: 'delete',
 *     label: '批量删除',
 *     icon: Trash2,
 *     variant: 'destructive',
 *     onClick: handleBatchDelete,
 *   },
 *   {
 *     id: 'publish',
 *     label: '批量发布',
 *     icon: Eye,
 *     onClick: handleBatchPublish,
 *   },
 * ];
 *
 * {selectedIds.length > 0 && (
 *   <BatchActionsBar
 *     selectedCount={selectedIds.length}
 *     actions={batchActions}
 *     onClear={() => setSelectedIds([])}
 *   />
 * )}
 * ```
 */
export function BatchActionsBar({
  selectedCount,
  actions,
  onClear,
  className,
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-background border border-border shadow-lg rounded-xl',
        'px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4',
        className
      )}
    >
      <span className="text-sm font-medium">
        已选择 <span className="text-primary">{selectedCount}</span> 项
      </span>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'default'}
            size="sm"
            onClick={action.onClick}
            className="gap-2"
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="icon" onClick={onClear}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * 预定义的批量操作工厂函数
 */
export const commonBatchActions = {
  delete: (onClick: () => void) => ({
    id: 'delete',
    label: '批量删除',
    variant: 'destructive' as const,
    onClick,
  }),

  publish: (onClick: () => void) => ({
    id: 'publish',
    label: '批量发布',
    variant: 'default' as const,
    onClick,
  }),

  unpublish: (onClick: () => void) => ({
    id: 'unpublish',
    label: '批量取消发布',
    variant: 'outline' as const,
    onClick,
  }),
};
