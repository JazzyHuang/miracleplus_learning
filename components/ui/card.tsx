import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card — 双主题自适应卡片
 * 
 * 浅色模式：纯白底，暖灰边框，微妙阴影
 * 深色模式：深灰底，深灰边框，深色阴影
 * 
 * 3-level elevation system:
 * - Level 1 (Surface): card-surface utility — 列表项、基础容器
 * - Level 2 (Raised): Card component — 内容卡片、表单
 * - Level 3 (Floating): GlassCard component — 弹窗、重要面板
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "relative flex w-full flex-col gap-6 rounded-xl p-6",
        "bg-card text-card-foreground",
        "border border-border/50",
        "shadow-theme-sm",
        "transition-all duration-300",
        "hover:shadow-theme-md hover:border-primary/15",
        className
      )}
      {...props}
    />
  )
}

/**
 * GlassCard — 半透明面板（弹窗、重要面板）
 */
function GlassCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card"
      className={cn(
        "relative flex w-full flex-col gap-6 rounded-xl p-6",
        "bg-card/80 text-card-foreground",
        "backdrop-blur-xl",
        "border border-border/50",
        "shadow-theme-md",
        "transition-all duration-300",
        className
      )}
      {...props}
    />
  )
}

/**
 * DarkCard — 次级表面卡片（侧边栏、导航等需要区分的场景）
 */
function DarkCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dark-card"
      className={cn(
        "relative flex w-full flex-col gap-6 rounded-xl p-6",
        "bg-secondary text-secondary-foreground",
        "border border-border/50",
        "transition-all duration-300",
        className
      )}
      {...props}
    />
  )
}

/**
 * MetricCard — Dashboard 统计卡片
 * padding 统一为 p-6 符合 Design Tokens 规范
 */
function MetricCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="metric-card"
      className={cn(
        "relative flex w-full flex-col gap-3 rounded-xl p-6",
        "bg-card text-card-foreground",
        "border border-border/50",
        "shadow-theme-sm",
        "transition-all duration-300",
        "hover:shadow-theme-md hover:border-primary/15",
        "group",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-2",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-lg font-medium text-card-foreground tracking-tight leading-none",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center pt-4 border-t border-border/40",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  GlassCard,
  DarkCard,
  MetricCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
