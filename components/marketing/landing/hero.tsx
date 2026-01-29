"use client";

import { m } from "framer-motion";
import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import Link from "next/link";
import { Spotlight } from "./spotlight";
import { SpotlightCard } from "./spotlight-card";
import { Badge } from "./badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-black pt-32 pb-20 md:pt-40 md:pb-32">
      {/* Background Effects */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="container relative z-10 mx-auto px-4 max-w-screen-xl">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-zinc-800 bg-zinc-900/50 backdrop-blur text-zinc-400">
              <Sparkles className="mr-2 h-3 w-3 text-yellow-400" />
              全新 AI 实战平台上线
            </Badge>
          </m.div>

          {/* Heading */}
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl max-w-4xl mx-auto"
          >
            掌握 AI 技术
            <br />
            <span className="text-white">构建你的未来</span>
          </m.h1>

          {/* Subheading */}
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl leading-relaxed"
          >
            Miracle Learning 是为创业者打造的一站式 AI 学习平台。
            <br className="hidden md:block" />
            从实战课程到工具体验，全方位提升你的 AI 认知与能力。
          </m.p>

          {/* CTA Buttons */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link href="/register">
              <button className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-white px-8 font-medium text-black transition-all duration-300 hover:bg-neutral-200 hover:scale-105 hover:ring-2 hover:ring-white/50 hover:ring-offset-2 hover:ring-offset-black">
                <span className="mr-2">开始免费学习</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </Link>
            <Link href="/courses">
              <button className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-800 bg-black px-8 font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white">
                浏览课程库
              </button>
            </Link>
          </m.div>

          {/* Interactive Visual */}
          <m.div
            initial={{ opacity: 0, y: 40, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
            className="mt-20 w-full max-w-5xl perspective-1000"
          >
            <div className="relative rounded-xl border border-white/10 bg-black/40 bg-grid-white/[0.02] backdrop-blur shadow-2xl overflow-hidden ring-1 ring-white/10">
              {/* Window Controls */}
              <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/20" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/20" />
                <div className="h-3 w-3 rounded-full bg-green-500/20" />
                <div className="ml-4 text-xs font-mono text-zinc-500">learning-dashboard.tsx</div>
              </div>
              
              {/* Fake Dashboard Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
                {/* Metric Card 1 */}
                <SpotlightCard className="col-span-1 h-40 p-6 flex flex-col justify-between bg-zinc-900/50">
                   <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                     <Terminal className="h-4 w-4 text-blue-400" />
                   </div>
                   <div>
                     <div className="text-3xl font-bold text-white">12</div>
                     <div className="text-sm text-zinc-500">已掌握 AI 工具</div>
                   </div>
                </SpotlightCard>
                
                {/* Metric Card 2 */}
                <SpotlightCard className="col-span-1 h-40 p-6 flex flex-col justify-between bg-zinc-900/50">
                   <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                     <Sparkles className="h-4 w-4 text-purple-400" />
                   </div>
                   <div>
                     <div className="text-3xl font-bold text-white">850</div>
                     <div className="text-sm text-zinc-500">学习积分</div>
                   </div>
                </SpotlightCard>

                {/* Code Snippet */}
                <div className="col-span-1 md:col-span-1 rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-400 overflow-hidden">
                  <div className="flex gap-2 mb-2">
                    <span className="text-blue-400">const</span>
                    <span className="text-yellow-200">progress</span>
                    <span className="text-white">=</span>
                    <span className="text-green-400">await</span>
                    <span className="text-purple-300">learnAI</span>();
                  </div>
                  <div className="pl-4">
                    <span className="text-purple-300">console</span>.<span className="text-blue-300">log</span>(<span className="text-orange-300">"Level Up!"</span>);
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full w-[70%] bg-blue-500/50" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glow behind the dashboard */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-t from-blue-500/20 to-purple-500/20 blur-3xl opacity-30" />
          </m.div>
        </div>
      </div>
    </section>
  );
}
