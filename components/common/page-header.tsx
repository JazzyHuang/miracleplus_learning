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
 * Page Header — 品牌蓝色图标 + 大标题
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  className,
  actions,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-8', className)}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 gradient-brand rounded-xl flex items-center justify-center shadow-theme-sm">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-medium text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-foreground/50 text-sm mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
