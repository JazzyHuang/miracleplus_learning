'use client';

import * as React from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';

type ConfirmVariant = 'default' | 'destructive' | 'warning' | 'info';

interface ConfirmDialogProps {
  /** 是否打开对话框 */
  open: boolean;
  /** 关闭对话框回调 */
  onOpenChange: (open: boolean) => void;
  /** 对话框标题 */
  title: string;
  /** 对话框描述 */
  description?: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 对话框变体 */
  variant?: ConfirmVariant;
  /** 确认回调 */
  onConfirm: () => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 子内容 */
  children?: React.ReactNode;
}

const variantConfig: Record<ConfirmVariant, {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  buttonVariant: 'default' | 'destructive' | 'secondary' | 'outline';
}> = {
  default: {
    icon: CheckCircle,
    iconClassName: 'text-primary',
    buttonVariant: 'default',
  },
  destructive: {
    icon: Trash2,
    iconClassName: 'text-destructive',
    buttonVariant: 'destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: 'text-amber-500',
    buttonVariant: 'default',
  },
  info: {
    icon: Info,
    iconClassName: 'text-blue-500',
    buttonVariant: 'default',
  },
};

/**
 * 确认对话框组件
 * 
 * Phase 3: 替代原生 confirm()，提供一致的 UI 和更好的用户体验
 * 
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * 
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="删除课程"
 *   description="确定要删除这个课程吗？此操作无法撤销。"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
  children,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('确认操作失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const showLoading = loading || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={!showLoading}
        role="alertdialog"
        aria-modal="true"
      >
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`shrink-0 p-2 rounded-full bg-muted ${config.iconClassName}`}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1 text-left">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-2">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {children && (
          <div className="py-2">
            {children}
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={showLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={showLoading}
            aria-busy={showLoading}
          >
            {showLoading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 使用确认对话框的 Hook
 * 
 * @example
 * ```tsx
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: '删除课程',
 *     description: '确定要删除吗？',
 *     variant: 'destructive',
 *   });
 *   if (confirmed) {
 *     // 执行删除
 *   }
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={handleDelete}>删除</Button>
 *     {ConfirmDialogComponent}
 *   </>
 * );
 * ```
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'>;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    props: { title: '' },
    resolve: null,
  });

  const confirm = React.useCallback(
    (props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          props,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }, [state.resolve]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      state.resolve?.(false);
    }
    setState((prev) => ({ ...prev, open, resolve: open ? prev.resolve : null }));
  }, [state.resolve]);

  const ConfirmDialogComponent = (
    <ConfirmDialog
      {...state.props}
      open={state.open}
      onOpenChange={handleOpenChange}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, ConfirmDialogComponent };
}
