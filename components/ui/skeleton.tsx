import { cn } from "@/lib/utils"

/**
 * 骨架屏组件
 * 
 * Phase 1 修复：添加 ARIA 属性提升可访问性
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
      className={cn("bg-muted animate-pulse rounded-xl", className)}
      {...props}
    />
  )
}

export { Skeleton }
