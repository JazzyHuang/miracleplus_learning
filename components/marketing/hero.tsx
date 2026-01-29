"use client";

import { Button } from "@/components/ui/button";
import { FadeIn, TextReveal } from "@/components/ui/motion";
import { ArrowRight, Compass, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { m } from "framer-motion";
import { useUser } from "@/contexts/user-context";

export function Hero() {
  // 复用UserContext中的用户状态，避免重复查询
  const { user } = useUser();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] opacity-30 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] opacity-20" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="container relative z-10 px-4 md:px-6 text-center">
        <FadeIn delay={0.2} className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-violet-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            Miracle Learning v2.0 is live
          </div>
        </FadeIn>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white mb-8 max-w-5xl mx-auto leading-[1.1]">
          <TextReveal text="Become the Navigator" className="block mb-2" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-white">
            in the AI Era
          </span>
        </h1>

        <FadeIn delay={0.6} className="max-w-2xl mx-auto mb-10">
          <p className="text-lg md:text-xl text-white/60 leading-relaxed">
            Don't just drift in the sea of information. Master AI tools, join live workshops,
            and build your future with a community of explorers.
          </p>
        </FadeIn>

        <FadeIn delay={0.8} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            // 已登录用户
            <Button
              asChild
              size="lg"
              className="h-12 px-8 rounded-full bg-white text-black hover:bg-white/90 font-semibold text-base shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard size={18} /> 进入控制台
              </Link>
            </Button>
          ) : (
            // 未登录用户
            <Button
              asChild
              size="lg"
              className="h-12 px-8 rounded-full bg-white text-black hover:bg-white/90 font-semibold text-base shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300"
            >
              <Link href="/register" className="flex items-center gap-2">
                Start Journey <ArrowRight size={18} />
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
          >
            <Link href="#features" className="flex items-center gap-2">
              <Compass size={18} /> Explore Ecosystem
            </Link>
          </Button>
        </FadeIn>

        {/* Floating UI Elements (Decorative) */}
        <m.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none"
        />
      </div>
    </section>
  );
}
