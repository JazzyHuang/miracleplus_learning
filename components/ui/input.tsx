import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Input — 双主题自适应输入框
 * 
 * 浅色：白底 + 暖灰边框
 * 深色：深灰底 + 深灰边框
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg px-3 py-2 text-sm",
        "bg-card text-card-foreground",
        "placeholder:text-muted-foreground",
        "border border-border",
        "outline-none transition-all duration-200",
        "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
        "selection:bg-primary/20 selection:text-card-foreground",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-muted-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive/50 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

/**
 * PasswordInput — 带可见性切换的密码输入框
 */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, 'type'>) {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={showPassword ? "隐藏密码" : "显示密码"}
        aria-pressed={showPassword}
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

/**
 * SearchInput — 胶囊形搜索输入框
 */
function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="search"
      data-slot="search-input"
      className={cn(
        "h-10 w-full min-w-0 rounded-pill pl-10 pr-4 py-2 text-sm",
        "bg-card text-card-foreground",
        "placeholder:text-muted-foreground",
        "border border-border",
        "outline-none transition-all duration-200",
        "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
        className
      )}
      {...props}
    />
  )
}

/**
 * GlassInput — 半透明输入框（特殊背景场景）
 */
function GlassInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="glass-input"
      className={cn(
        "h-12 w-full min-w-0 rounded-lg px-4 py-3 text-sm",
        "bg-secondary/50 backdrop-blur-xl text-foreground",
        "placeholder:text-muted-foreground",
        "border border-border",
        "outline-none transition-all duration-200",
        "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input, PasswordInput, SearchInput, GlassInput }
