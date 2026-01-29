"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Spotlight } from "./spotlight";

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-black py-32">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      
      <div className="container relative z-10 mx-auto px-4 text-center">
        <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 text-4xl font-bold tracking-tight md:text-6xl max-w-4xl mx-auto">
          准备好开始你的 AI 之旅了吗？
        </h2>
        <p className="mt-6 text-xl text-zinc-400 max-w-2xl mx-auto">
          立即加入 Miracle Learning，与数千名创业者一起掌握未来技术。
        </p>
        
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
           <Link href="/register">
              <button className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-white px-10 font-bold text-black transition-all duration-300 hover:bg-neutral-200 hover:scale-105 hover:ring-2 hover:ring-white/50 hover:ring-offset-2 hover:ring-offset-black">
                <span className="mr-2">免费注册账户</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </Link>
        </div>
      </div>
    </section>
  );
}
