"use client";

import { 
  Bot, 
  Trophy, 
  Users, 
  Video, 
  Search, 
  Star,
  Zap,
  Calendar
} from "lucide-react";
import { SpotlightCard } from "./spotlight-card";
import { Badge } from "./badge";

export function Features() {
  return (
    <section className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4 max-w-screen-xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 text-3xl font-bold tracking-tight md:text-5xl">
            全方位的 AI 学习生态
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            不仅仅是课程，更是一个让你持续成长的系统。
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          
          {/* Card 1: AI Tools Directory (Large, spans 2 cols) */}
          <SpotlightCard className="col-span-1 md:col-span-2 relative group overflow-hidden bg-zinc-900/20">
            <div className="p-8 h-full flex flex-col z-10 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Bot className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">AI 工具体验台</h3>
              </div>
              <p className="text-zinc-400 max-w-md">
                收录 100+ 精选 AI 工具，提供深度评测与使用指南。不再为寻找工具而烦恼。
              </p>
              
              {/* Mock Search UI */}
              <div className="mt-auto pt-8">
                <div className="relative rounded-lg border border-zinc-800 bg-zinc-950/50 p-2 backdrop-blur-sm">
                  <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-800/50">
                    <Search className="h-4 w-4 text-zinc-500" />
                    <div className="h-2 w-24 rounded-full bg-zinc-800" />
                  </div>
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-zinc-800" />
                          <div className="space-y-1">
                            <div className="h-2 w-16 rounded bg-zinc-700" />
                            <div className="h-2 w-10 rounded bg-zinc-800" />
                          </div>
                        </div>
                        <div className="h-6 w-12 rounded-full bg-blue-500/10" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Background Gradient */}
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
          </SpotlightCard>

          {/* Card 2: Gamification (Tall, spans 1 col, 2 rows) */}
          <SpotlightCard className="col-span-1 row-span-2 relative group overflow-hidden bg-zinc-900/20">
             <div className="p-8 h-full flex flex-col z-10 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">积分排行榜</h3>
              </div>
              <p className="text-zinc-400 mb-6">
                通过学习获取积分，收集成就勋章。让学习变得像游戏一样有趣。
              </p>

              {/* Mock Leaderboard */}
              <div className="flex-1 space-y-3 relative">
                {[
                  { name: "Alex", score: "2,450", color: "text-yellow-400" },
                  { name: "Sarah", score: "2,100", color: "text-zinc-300" },
                  { name: "Mike", score: "1,850", color: "text-orange-400" },
                  { name: "You", score: "1,200", color: "text-blue-400", active: true },
                  { name: "David", score: "950", color: "text-zinc-500" },
                ].map((user, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                      user.active 
                        ? "bg-zinc-800/80 border-zinc-700 scale-105 shadow-lg" 
                        : "bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm text-zinc-500">0{i + 1}</div>
                      <div className={`h-8 w-8 rounded-full border border-white/10 flex items-center justify-center bg-zinc-900`}>
                        <span className="text-xs">{user.name[0]}</span>
                      </div>
                      <span className={`text-sm font-medium ${user.active ? "text-white" : "text-zinc-400"}`}>
                        {user.name}
                      </span>
                    </div>
                    <span className={`text-sm font-bold font-mono ${user.color}`}>
                      {user.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>

          {/* Card 3: Courses (Regular) */}
          <SpotlightCard className="col-span-1 relative group overflow-hidden bg-zinc-900/20">
             <div className="p-8 h-full flex flex-col z-10 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Video className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">实战课程</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                从 0 到 1 的系统化课程体系，配套作业与实战项目。
              </p>
              
              <div className="mt-auto grid grid-cols-2 gap-2">
                <Badge variant="outline" className="justify-center py-2 bg-zinc-900/80">Prompt Engineering</Badge>
                <Badge variant="outline" className="justify-center py-2 bg-zinc-900/80">AI Workflow</Badge>
                <Badge variant="outline" className="justify-center py-2 bg-zinc-900/80">Agent Dev</Badge>
                <Badge variant="outline" className="justify-center py-2 bg-zinc-900/80">LLM Fine-tuning</Badge>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 4: Workshops & Community (Regular) */}
          <SpotlightCard className="col-span-1 relative group overflow-hidden bg-zinc-900/20">
             <div className="p-8 h-full flex flex-col z-10 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Users className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">工作坊 & 社区</h3>
              </div>
              <p className="text-zinc-400 text-sm">
                每周直播工作坊，与数百名创业者共同交流成长。
              </p>
              
              <div className="mt-6 flex -space-x-2 overflow-hidden">
                 {[1,2,3,4,5].map((i) => (
                   <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                     U{i}
                   </div>
                 ))}
                 <div className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-zinc-900 flex items-center justify-center text-xs text-zinc-500">
                   +99
                 </div>
              </div>
            </div>
          </SpotlightCard>

        </div>
      </div>
    </section>
  );
}
