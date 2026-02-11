/**
 * CTA — Server Component（零 JS）
 * 
 * 优化：
 * - 移除 'use client'
 * - Spotlight SVG 已是 Server Component
 * - 用 CSS scroll-reveal-up 替代 Framer Motion 入场动画
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Spotlight } from "./spotlight";

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-background py-32">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      
      <div className="container relative z-10 mx-auto px-4 text-center">
        <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 text-4xl font-bold tracking-tight md:text-6xl max-w-4xl mx-auto scroll-reveal-up">
          准备好开始你的 AI 之旅了吗？
        </h2>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto scroll-reveal-up">
          立即加入 Miracle Learning，与数千名创业者一起掌握未来技术。
        </p>
        
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row scroll-reveal-up">
           <Link href="/register" className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-card px-10 font-bold text-card-foreground transition-all duration-300 hover:bg-accent hover:scale-105 hover:ring-2 hover:ring-foreground/50 hover:ring-offset-2 hover:ring-offset-background">
              <span className="mr-2">免费注册账户</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
        </div>
      </div>
    </section>
  );
}
