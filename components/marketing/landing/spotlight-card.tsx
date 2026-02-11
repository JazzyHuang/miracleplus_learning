"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * SpotlightCard — CSS Custom Properties 模式
 * 
 * SOTA 优化：
 * - 移除 useState（消除每次 mousemove 触发的 React re-render）
 * - JS 仅更新 CSS 变量（直接 DOM 操作，不经过 React 调度）
 * - CSS radial-gradient 引用变量，视觉效果由 GPU 合成器处理
 * - 配合 globals.css 中的 .spotlight-effect 样式
 */
export const SpotlightCard = ({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.15)",
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      className={cn(
        "spotlight-effect rounded-xl border border-border bg-secondary/50 text-foreground shadow-sm",
        className
      )}
      style={{ '--spotlight-color': spotlightColor } as React.CSSProperties}
      onMouseMove={handleMouseMove}
    >
      <div className="relative h-full">{children}</div>
    </div>
  );
};
