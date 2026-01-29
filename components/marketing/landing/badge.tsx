import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = ({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "outline" | "secondary" }) => {
  return (
    <div className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variant === "default" && "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
      variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      variant === "outline" && "text-foreground",
      "bg-zinc-900/50 border-zinc-800 text-zinc-400 backdrop-blur-sm", // Resend specific override
      className
    )} {...props} />
  )
}

export { Badge }
