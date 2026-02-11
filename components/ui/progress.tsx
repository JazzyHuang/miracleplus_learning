"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

/**
 * Progress — Learn About 风格进度条
 * 
 * 白卡片内: bg-muted 轨道 + 品牌蓝指示器
 */
interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  label?: string;
  indeterminate?: boolean;
  variant?: "default" | "gradient" | "brand" | "glow";
}

function Progress({
  className,
  value,
  label,
  indeterminate = false,
  variant = "default",
  ...props
}: ProgressProps) {
  const safeValue = value ?? 0;
  
  const indicatorStyles = {
    default: "bg-primary",
    gradient: "bg-gradient-to-r from-primary to-brand-secondary",
    brand: "bg-gradient-to-r from-primary via-brand-secondary to-primary",
    glow: "bg-primary shadow-theme-sm",
  }
  
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : safeValue}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-label={label}
      aria-busy={indeterminate}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all duration-300 ease-out rounded-full",
          indicatorStyles[variant],
          indeterminate && "animate-pulse"
        )}
        style={{ 
          transform: indeterminate 
            ? undefined 
            : `translateX(-${100 - safeValue}%)` 
        }}
      />
    </ProgressPrimitive.Root>
  )
}

/**
 * ProgressBar — 带标签的进度条
 */
interface ProgressBarProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  label?: string;
  showValue?: boolean;
  variant?: "default" | "gradient" | "brand" | "glow";
}

function ProgressBar({
  className,
  value,
  label,
  showValue = false,
  variant = "default",
  ...props
}: ProgressBarProps) {
  const safeValue = value ?? 0;
  
  const indicatorStyles = {
    default: "bg-primary",
    gradient: "bg-gradient-to-r from-primary via-brand-secondary to-primary",
    brand: "bg-gradient-to-r from-primary via-brand-secondary to-primary",
    glow: "bg-primary shadow-theme-sm",
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && <span className="text-muted-foreground tabular-nums">{Math.round(safeValue)}%</span>}
        </div>
      )}
      <ProgressPrimitive.Root
        data-slot="progress-bar"
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-bar-indicator"
          className={cn(
            "h-full w-full flex-1 transition-all duration-500 ease-out rounded-full",
            indicatorStyles[variant]
          )}
          style={{ transform: `translateX(-${100 - safeValue}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
}

export { Progress, ProgressBar }
