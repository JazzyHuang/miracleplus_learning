/**
 * Landing Hero — Server Component + CSS 动画
 * 
 * 优化：
 * - 移除 'use client'（SpotlightCard 在 Features 页单独使用）
 * - 5 个 m.div 全部替换为 CSS animate-fade-up / scroll-reveal-up
 * - 零 Framer Motion JS 开销
 */

import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import Link from "next/link";
import { Spotlight } from "./spotlight";
import { Badge } from "./badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background pt-32 pb-20 md:pt-40 md:pb-32">
      {/* Background Effects */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />

      <div className="container relative z-10 mx-auto px-4 max-w-screen-xl">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-8 animate-fade-up animate-delay-0">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-border bg-secondary backdrop-blur text-muted-foreground">
              <Sparkles className="mr-2 h-3 w-3 text-yellow-400" />
              全新 AI 实战平台上线
            </Badge>
          </div>

          {/* Heading */}
          <h1 className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl max-w-4xl mx-auto animate-fade-up animate-delay-100">
            成为引航者
            <br />
            <span className="text-foreground">在 AI 时代</span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed animate-fade-up animate-delay-200">
            加入数千名学习者的行列，系统化掌握 AI 时代的核心技能。
            <br className="hidden md:block" />
            从实战课程到工具体验，全方位提升你的 AI 认知与能力。
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row animate-fade-up animate-delay-300">
            <Link href="/register" className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-card px-8 font-medium text-card-foreground transition-all duration-300 hover:bg-accent hover:scale-105 hover:ring-2 hover:ring-foreground/50 hover:ring-offset-2 hover:ring-offset-background">
              <span className="mr-2">开始学习</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/courses" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              了解更多
            </Link>
          </div>

          {/* Interactive Visual — CSS 动画 */}
          <div className="mt-20 w-full max-w-5xl perspective-1000 animate-fade-up animate-delay-500">
            <div className="relative rounded-xl border border-border bg-background/40 bg-grid-white/[0.02] backdrop-blur shadow-2xl overflow-hidden ring-1 ring-border">
              {/* Window Controls */}
              <div className="flex items-center gap-2 border-b border-border bg-foreground/5 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/20" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/20" />
                <div className="h-3 w-3 rounded-full bg-green-500/20" />
                <div className="ml-4 text-xs font-mono text-muted-foreground">学习仪表盘.tsx</div>
              </div>
              
              {/* Fake Dashboard Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
                {/* Metric Card 1 */}
                <div className="col-span-1 h-40 p-6 flex flex-col justify-between rounded-xl border border-border bg-secondary">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Terminal className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground">12</div>
                    <div className="text-sm text-muted-foreground">已掌握 AI 工具</div>
                  </div>
                </div>
                
                {/* Metric Card 2 */}
                <div className="col-span-1 h-40 p-6 flex flex-col justify-between rounded-xl border border-border bg-secondary">
                  <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground">850</div>
                    <div className="text-sm text-muted-foreground">学习积分</div>
                  </div>
                </div>

                {/* Code Snippet */}
                <div className="col-span-1 md:col-span-1 rounded-xl bg-muted border border-border p-4 font-mono text-xs text-muted-foreground overflow-hidden">
                  <div className="flex gap-2 mb-2">
                    <span className="text-blue-400">const</span>
                    <span className="text-yellow-200">progress</span>
                    <span className="text-foreground">=</span>
                    <span className="text-green-400">await</span>
                    <span className="text-purple-300">learnAI</span>();
                  </div>
                  <div className="pl-4">
                    <span className="text-purple-300">console</span>.<span className="text-blue-300">log</span>(<span className="text-orange-300">&quot;升级成功!&quot;</span>);
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[70%] bg-blue-500/50" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glow behind the dashboard */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-t from-blue-500/20 to-purple-500/20 blur-3xl opacity-30" />
          </div>
        </div>
      </div>
    </section>
  );
}
