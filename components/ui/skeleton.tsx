import { cn } from "@/lib/utils"

/**
 * Skeleton — 双主题自适应骨架屏
 * 
 * 浅色：暖灰底 + 浅光泽 shimmer
 * 深色：深灰底 + 深光泽 shimmer
 */
function Skeleton({ 
  className, 
  "aria-label": ariaLabel = "加载中",
  ...props 
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn(
        "relative overflow-hidden rounded-lg",
        "bg-muted/70",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.03] before:to-transparent",
        "before:animate-shimmer",
        className
      )}
      {...props}
    />
  )
}

/**
 * SkeletonText — 文字骨架
 */
function SkeletonText({ 
  className,
  lines = 1,
  ...props 
}: React.ComponentProps<"div"> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 && "w-3/4"
          )} 
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard — 白色卡片骨架
 */
function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div 
      className={cn(
        "rounded-xl border border-border/50 bg-card p-6 space-y-4 shadow-theme-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

/**
 * SkeletonAvatar — 头像骨架
 */
function SkeletonAvatar({ 
  className,
  size = "default" 
}: { 
  className?: string
  size?: "sm" | "default" | "lg" 
}) {
  const sizes = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
  }
  
  return (
    <Skeleton className={cn("rounded-full", sizes[size], className)} />
  )
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar }
