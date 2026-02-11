import { InboxIcon, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState — 白色卡片内的温暖空状态
 * 
 * Learn About 风格：柔和蓝色图标、鼓励性文案
 */
export function EmptyState({ icon: Icon = InboxIcon, title, description, action }: EmptyStateProps) {
  return (
    <div role="status" aria-live="polite" aria-label={title} className="flex flex-col items-center justify-center py-16 text-center animate-fade-up">
      <div
        className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center mb-4 animate-scale-in"
        style={{ '--animation-delay': '100ms' } as React.CSSProperties}
      >
        <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
      </div>
      <h3
        className="text-lg font-medium text-card-foreground mb-1 animate-fade-up"
        style={{ '--animation-delay': '150ms' } as React.CSSProperties}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-muted-foreground text-sm max-w-sm animate-fade-up"
          style={{ '--animation-delay': '200ms' } as React.CSSProperties}
        >
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors animate-fade-up shadow-sm"
          style={{ '--animation-delay': '250ms' } as React.CSSProperties}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
