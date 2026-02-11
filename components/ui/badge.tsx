import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — Learn About 风格柔和徽章
 * 
 * 在白卡片上使用柔和的 pastel 背景色
 * 全部 rounded-full
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-colors duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        // Default — 蓝色填充
        default:
          "border-transparent bg-primary text-primary-foreground",
        
        // Secondary — 柔和灰色
        secondary:
          "border-border bg-muted text-muted-foreground",
        
        // Outline — 仅边框
        outline:
          "border-border bg-transparent text-card-foreground",
        
        // Destructive — 柔和红色
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive",
        
        // Success — 柔和绿色
        success:
          "border-success/20 bg-success/10 text-success",
        
        // Warning — 柔和琥珀
        warning:
          "border-warning/20 bg-warning/10 text-warning",
        
        // Info — 柔和蓝色
        info:
          "border-info/20 bg-info/10 text-info",
        
        // Brand — 品牌渐变
        brand:
          "border-primary/20 bg-gradient-to-r from-primary/10 to-brand-secondary/10 text-primary",
        
        // Glow — 发光
        glow:
          "border-primary/20 bg-gradient-to-r from-primary/10 to-brand-secondary/10 text-primary shadow-theme-sm",
      },
      size: {
        default: "h-5 px-2.5 text-xs",
        sm: "h-4 px-2 text-xs",
        lg: "h-6 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/**
 * StatusDot — 状态指示点
 */
function StatusDot({ 
  className, 
  status = "default" 
}: { 
  className?: string
  status?: "default" | "success" | "warning" | "error" | "info"
}) {
  const colors = {
    default: "bg-muted-foreground",
    success: "bg-success",
    warning: "bg-warning", 
    error: "bg-destructive",
    info: "bg-info",
  }

  return (
    <span
      data-slot="status-dot"
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        colors[status],
        status !== "default" && "animate-pulse",
        className
      )}
    />
  )
}

export { Badge, StatusDot, badgeVariants }
