/**
 * Journey — Server Component + CSS Scroll-Driven Animations
 * 
 * 优化：
 * - 移除 'use client'（零 JS API）
 * - useScroll/useTransform → CSS animation-timeline: scroll()
 * - m.div whileInView → CSS scroll-reveal-up
 * - 时间轴竖线 → CSS scroll-timeline-line
 * - 合成器线程执行，零主线程开销
 */

import { cn } from "@/lib/utils";

const steps = [
  {
    title: "观察者",
    description: "被 AI 信息淹没？你正在观望，不知从何开始。",
    icon: "👁️",
    color: "text-muted-foreground",
    bg: "bg-secondary",
    border: "border-border",
  },
  {
    title: "学习者",
    description: "动手实践，真实项目。你开始构建并理解核心概念。",
    icon: "🚀",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
  {
    title: "引航者",
    description: "引领方向。创造、分享，在社区中指导他人。你定义未来。",
    icon: "🌟",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/50",
  },
];

export function Journey() {
  return (
    <section id="journey" className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-24 scroll-reveal-up">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            你的进阶之路
          </h2>
          <p className="text-foreground/50 text-lg max-w-2xl mx-auto">
            从好奇的观察者到自信的引航者，我们陪你走好每一步。
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Central Line — 静态背景线 */}
          <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-0.5 bg-foreground/10 -translate-x-1/2" />
          
          {/* Active Line — CSS scroll-driven 动画驱动增长 */}
          <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-primary -translate-x-1/2 origin-top scroll-timeline-line" />

          <div className="space-y-24">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "relative flex flex-col md:flex-row gap-8 md:gap-0 items-start md:items-center scroll-reveal-up",
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                )}
                style={{
                  animationDelay: `${index * 150}ms`
                }}
              >
                {/* Content Card */}
                <div className="flex-1 w-full md:w-1/2 pl-12 md:pl-0 md:px-12">
                  <div className={cn(
                    "p-6 rounded-2xl border backdrop-blur-sm transition-all duration-500 hover:scale-105",
                    step.bg, step.border
                  )}>
                    <h3 className={cn("text-2xl font-bold mb-2", step.color)}>
                      {step.title}
                    </h3>
                    <p className="text-foreground/70 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Center Node */}
                <div className="absolute left-[20px] md:left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-background border-4 border-background z-10 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                  <div className={cn(
                    "w-full h-full rounded-full flex items-center justify-center text-sm border-2",
                    index === 2 ? "bg-primary border-primary animate-pulse" : "bg-muted border-border"
                  )}>
                    {step.icon}
                  </div>
                </div>

                {/* Empty Space for Alternating Layout */}
                <div className="hidden md:block flex-1 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
