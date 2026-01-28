"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

/**
 * 进度条组件
 * 
 * Phase 1 修复：
 * 1. 添加 ARIA 属性（aria-valuenow, aria-valuemin, aria-valuemax）
 * 2. 统一动画时长为 duration-200
 */
interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  /** 进度条标签，用于可访问性 */
  label?: string;
  /** 是否显示不确定状态 */
  indeterminate?: boolean;
}

function Progress({
  className,
  value,
  label,
  indeterminate = false,
  ...props
}: ProgressProps) {
  const safeValue = value ?? 0;
  
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-busy={indeterminate}
      className={cn(
        "bg-muted relative h-1.5 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "bg-foreground h-full w-full flex-1 transition-all duration-200 rounded-full",
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

export { Progress }
