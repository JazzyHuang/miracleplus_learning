"use client";

import { m, HTMLMotionProps } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";

/**
 * FadeIn Component
 * Simple fade-in animation with optional delay and direction.
 * 
 * **SOTA 推荐**: 对于滚动触发的淡入效果，优先使用 CSS class：
 * - `scroll-reveal-up` — 从下方淡入上移（合成器线程，零 JS）
 * - `scroll-reveal` — 纯淡入
 * - `scroll-reveal-left` — 从右侧淡入左移
 * - `scroll-reveal-scale` — 缩放淡入
 * 
 * 仅在需要精确的 delay/direction 控制时使用此 Framer Motion 版本。
 */
interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
  fullWidth?: boolean;
}

export const FadeIn = ({
  children,
  delay = 0,
  direction = "up",
  duration = 0.3,
  className,
  fullWidth = false,
  ...props
}: FadeInProps) => {
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
      x: direction === "left" ? 20 : direction === "right" ? -20 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98] as const,
      },
    },
  };

  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={variants}
      className={cn(fullWidth ? "w-full" : "", className)}
      {...props}
    >
      {children}
    </m.div>
  );
};

/**
 * StaggerContainer Component
 * Orchestrates staggered animations for children.
 * 
 * **SOTA 推荐**: 优先使用 CSS class：
 * ```html
 * <div class="scroll-stagger">
 *   <div class="scroll-reveal-up">子元素 1</div>
 *   <div class="scroll-reveal-up">子元素 2</div>
 * </div>
 * ```
 */
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerChildren?: number;
  delayChildren?: number;
}

export const StaggerContainer = ({
  children,
  staggerChildren = 0.1,
  delayChildren = 0,
  className,
  ...props
}: StaggerContainerProps) => {
  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };

  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
};

/**
 * TextReveal Component
 * Reveals text character by character or word by word.
 * 
 * 保留 Framer Motion — spring 物理动画无法用 CSS 替代
 */
interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  mode?: "char" | "word";
}

export const TextReveal = ({ text, className, delay = 0, mode = "word" }: TextRevealProps) => {
  const words = text.split(" ");
  const chars = text.split("");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 28,
        stiffness: 300,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring" as const,
        damping: 28,
        stiffness: 300,
      },
    },
  };

  if (mode === "char") {
    return (
      <m.span
        className={cn("inline-block", className)}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {chars.map((char, index) => (
          <m.span variants={child} key={index}>
            {char === " " ? "\u00A0" : char}
          </m.span>
        ))}
      </m.span>
    );
  }

  return (
    <m.div
      className={cn("flex flex-wrap gap-x-[0.25em]", className)}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {words.map((word, index) => (
        <m.span variants={child} key={index} className="inline-block">
          {word}
        </m.span>
      ))}
    </m.div>
  );
};

/**
 * GlowBorder Component — 纯 CSS hover 效果
 * 
 * **SOTA 推荐**: 直接在 HTML 元素上使用 CSS class `glow-border`：
 * ```html
 * <div class="glow-border rounded-lg">
 *   <div class="relative bg-background rounded-lg">内容</div>
 * </div>
 * ```
 * 
 * 此组件保留用于向后兼容，内部使用纯 CSS 实现。
 */
export const GlowBorder = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn("glow-border", className)}>
      <div className="relative bg-background rounded-lg">{children}</div>
    </div>
  );
};

/**
 * ParallaxScroll Component — CSS Scroll-Driven Animation
 * 
 * **已迁移到纯 CSS**: 使用 `scroll-parallax` class 替代。
 * 
 * ```html
 * <div class="scroll-parallax">内容</div>
 * ```
 * 
 * CSS 在合成器线程执行，零主线程开销，不需要 useScroll/useTransform。
 * 此组件保留用于向后兼容。
 */
export const ParallaxScroll = ({
  children,
  className,
}: {
  children: React.ReactNode;
  offset?: number;
  className?: string;
}) => {
  return (
    <div className={cn("scroll-parallax", className)}>
      {children}
    </div>
  );
};
