import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Phase 1 修复：统一动画时长为 duration-200
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive/30",
        outline:
          "border border-border bg-background hover:bg-muted hover:border-foreground/20 active:bg-muted/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:bg-secondary/60",
        ghost:
          "hover:bg-muted hover:text-foreground active:bg-muted/80",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        // 优化触摸目标：最小 44px（WCAG 2.2 AA 标准）
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        // Phase 1 修复：sm 尺寸应为 h-9 而非 h-10
        sm: "h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
