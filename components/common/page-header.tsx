import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** 页面图标 */
  icon: LucideIcon;
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 自定义类名 */
  className?: string;
  /** 右侧操作区域 */
  actions?: React.ReactNode;
}

/**
 * 通用页面头部组件
 * 包含图标、标题、描述和可选的操作区域
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  className,
  actions,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-10', className)}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-background" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
