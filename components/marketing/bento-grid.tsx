"use client";

import { FadeIn, GlowBorder, StaggerContainer } from "@/components/ui/motion";
import { Bot, Calendar, Trophy, Users, Sparkles } from "lucide-react";

export function BentoGrid() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4 md:px-6">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            The Explorer's Toolkit
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Everything you need to navigate the AI landscape, packaged in a powerful, integrated platform.
          </p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[300px]">
          {/* AI Tools - Large Card (2x2) */}
          <div className="md:col-span-2 md:row-span-2">
            <GlowBorder className="h-full w-full overflow-hidden">
              <div className="h-full bg-black/40 backdrop-blur-sm p-8 flex flex-col relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
                    <Bot size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white">AI Tools Directory</h3>
                </div>
                <p className="text-white/60 mb-8 max-w-md">
                  Discover, filter, and master the latest AI tools. Our curated directory helps you find the right tool for any task.
                </p>
                
                {/* Mock UI */}
                <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="mt-10 space-y-3">
                    <div className="h-8 w-3/4 bg-white/10 rounded animate-pulse" />
                    <div className="h-24 w-full bg-white/5 rounded border border-white/5" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-20 bg-violet-500/10 rounded border border-violet-500/20" />
                      <div className="h-20 bg-cyan-500/10 rounded border border-cyan-500/20" />
                    </div>
                  </div>
                  
                  {/* Floating Badge */}
                  <div className="absolute bottom-4 right-4 bg-violet-600 text-white text-xs px-3 py-1 rounded-full shadow-lg transform group-hover:-translate-y-1 transition-transform">
                    100+ Tools
                  </div>
                </div>
              </div>
            </GlowBorder>
          </div>

          {/* Workshops - Tall Card (1x2) */}
          <div className="md:col-span-1 md:row-span-2">
            <GlowBorder className="h-full w-full overflow-hidden">
              <div className="h-full bg-black/40 backdrop-blur-sm p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Calendar size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Live Workshops</h3>
                </div>
                <p className="text-white/60 mb-6 text-sm">
                  Join hands-on sessions with industry experts.
                </p>

                <div className="flex-1 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-cyan-400">FEB {10 + i}</span>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/50">LIVE</span>
                      </div>
                      <h4 className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                        Building AI Agents with LangChain
                      </h4>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                  <span className="text-xs text-white/40">Next session starts in 2 days</span>
                </div>
              </div>
            </GlowBorder>
          </div>

          {/* Gamification - Small Card (1x1) */}
          <div className="md:col-span-1 md:row-span-1">
            <GlowBorder className="h-full w-full overflow-hidden">
              <div className="h-full bg-gradient-to-br from-black/40 to-violet-900/20 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center relative group">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                <div className="mb-4 p-4 rounded-full bg-yellow-500/10 border border-yellow-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Trophy size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Earn Badges</h3>
                <p className="text-xs text-white/50">Level up your profile</p>
              </div>
            </GlowBorder>
          </div>

          {/* Community - Wide Card (2x1) */}
          <div className="md:col-span-2 md:row-span-1">
            <GlowBorder className="h-full w-full overflow-hidden">
              <div className="h-full bg-black/40 backdrop-blur-sm p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400">
                    <Users size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Vibrant Community</h3>
                </div>
                
                <div className="flex gap-4 overflow-hidden mask-linear-fade relative z-10">
                  <div className="flex gap-4 animate-scroll-left hover:pause">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-shrink-0 w-64 bg-white/5 border border-white/10 rounded-lg p-3 flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600" />
                        <div>
                          <p className="text-xs text-white font-medium">Alex Chen</p>
                          <p className="text-[10px] text-white/50 truncate w-40">Just launched my first AI app!</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlowBorder>
          </div>

          {/* AI Assistant - Small Card (1x1) */}
          <div className="md:col-span-1 md:row-span-1">
            <GlowBorder className="h-full w-full overflow-hidden">
              <div className="h-full bg-black/40 backdrop-blur-sm p-6 flex flex-col relative group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
                </div>
                <div className="flex-1 bg-white/5 rounded-lg p-3 text-xs text-white/60 font-mono leading-relaxed">
                  "How can I help you navigate your learning path today?"
                  <span className="inline-block w-1.5 h-3 bg-green-500 ml-1 animate-pulse" />
                </div>
              </div>
            </GlowBorder>
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
