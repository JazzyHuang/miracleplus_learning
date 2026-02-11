import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles — "克制的温度"：精致圆角、微妙交互
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary — 品牌靛蓝
        default: 
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-theme-sm hover:shadow-theme-md",
        
        // Destructive
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 hover:border-destructive/30",
        
        // Outline
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:border-border",
        
        // Secondary
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        
        // Ghost
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent",
        
        // Link
        link: 
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
        
        // Brand — 品牌渐变 CTA (唯一使用渐变的按钮)
        brand:
          "gradient-brand text-white shadow-theme-sm hover:shadow-theme-md hover:brightness-110",

        // Pill — 胶囊形按钮
        pill:
          "rounded-pill bg-primary text-primary-foreground px-8 py-3 text-base font-medium shadow-none hover:bg-primary/90 hover:shadow-theme-sm",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-lg gap-1.5 px-3 text-sm has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 text-base has-[>svg]:px-4",
        xl: "h-12 rounded-lg px-8 text-base has-[>svg]:px-5",
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

interface ButtonProps extends React.ComponentProps<"button">,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span className="sr-only">加载中...</span>
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
