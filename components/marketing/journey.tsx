"use client";

import { useScroll, useTransform, m } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "The Observer",
    description: "Overwhelmed by AI noise? You're watching from the sidelines, unsure where to start.",
    icon: "👁️",
    color: "text-gray-400",
    bg: "bg-gray-900/50",
    border: "border-gray-800",
  },
  {
    title: "The Learner",
    description: "Hands-on practice. Real projects. You start building and understanding the core concepts.",
    icon: "🚀",
    color: "text-cyan-400",
    bg: "bg-cyan-950/30",
    border: "border-cyan-500/30",
  },
  {
    title: "The Navigator",
    description: "Lead the way. Create, share, and mentor others in the community. You define the future.",
    icon: "🌟",
    color: "text-violet-400",
    bg: "bg-violet-950/30",
    border: "border-violet-500/50",
  },
];

export function Journey() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"]);

  return (
    <section id="journey" className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Your Journey to Mastery
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            From curious observer to confident navigator. We guide you every step of the way.
          </p>
        </div>

        <div ref={containerRef} className="relative max-w-4xl mx-auto">
          {/* Central Line */}
          <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-0.5 bg-white/10 -translate-x-1/2" />
          
          {/* Active Line (Animated) */}
          <m.div 
            style={{ height: lineHeight }}
            className="absolute left-[20px] md:left-1/2 top-0 w-0.5 bg-gradient-to-b from-violet-500 via-cyan-500 to-violet-500 -translate-x-1/2 origin-top"
          />

          <div className="space-y-24">
            {steps.map((step, index) => (
              <m.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: index * 0.2 }}
                className={cn(
                  "relative flex flex-col md:flex-row gap-8 md:gap-0 items-start md:items-center",
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                )}
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
                    <p className="text-white/70 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Center Node */}
                <div className="absolute left-[20px] md:left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black border-4 border-black z-10 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                  <div className={cn(
                    "w-full h-full rounded-full flex items-center justify-center text-sm border-2",
                    index === 2 ? "bg-violet-500 border-violet-400 animate-pulse" : "bg-gray-800 border-gray-700"
                  )}>
                    {step.icon}
                  </div>
                </div>

                {/* Empty Space for Alternating Layout */}
                <div className="hidden md:block flex-1 w-1/2" />
              </m.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
