/**
 * BentoGrid — Server Component（零 JS）
 * 
 * 优化：
 * - 移除 'use client'（零 JS API 使用）
 * - FadeIn → CSS scroll-reveal-up class
 * - StaggerContainer → CSS scroll-stagger class
 * - GlowBorder → CSS glow-border class
 */

import { Bot, Calendar, Trophy, Users, Sparkles } from "lucide-react";

export function BentoGrid() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16 scroll-reveal-up">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            探索者的工具箱
          </h2>
          <p className="text-foreground/50 text-lg max-w-2xl mx-auto">
            驾驭 AI 时代所需的一切，集成在一个强大的平台中。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[300px] scroll-stagger">
          {/* AI Tools - Large Card (2x2) */}
          <div className="md:col-span-2 md:row-span-2 scroll-reveal-up">
            <div className="glow-border h-full w-full overflow-hidden rounded-lg">
              <div className="h-full bg-background/40 backdrop-blur-sm p-8 flex flex-col relative rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary">
                    <Bot size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">AI 工具目录</h3>
                </div>
                <p className="text-foreground/60 mb-8 max-w-md">
                  发现、筛选并掌握最新的 AI 工具。我们精选的目录帮你为每项任务找到合适的工具。
                </p>
                
                {/* Mock UI */}
                <div className="flex-1 bg-foreground/5 rounded-xl border border-border p-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-10 bg-foreground/5 border-b border-border flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="mt-10 space-y-3">
                    <div className="h-8 w-3/4 bg-foreground/10 rounded animate-pulse" />
                    <div className="h-24 w-full bg-foreground/5 rounded border border-border" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-20 bg-primary/10 rounded border border-primary/20" />
                      <div className="h-20 bg-primary/10 rounded border border-primary/20" />
                    </div>
                  </div>
                  
                  {/* Floating Badge */}
                  <div className="absolute bottom-4 right-4 bg-primary text-foreground text-xs px-3 py-1 rounded-full shadow-lg transform group-hover:-translate-y-1 transition-transform">
                    100+ 工具
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workshops - Tall Card (1x2) */}
          <div className="md:col-span-1 md:row-span-2 scroll-reveal-up">
            <div className="glow-border h-full w-full overflow-hidden rounded-lg">
              <div className="h-full bg-background/40 backdrop-blur-sm p-6 flex flex-col rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary">
                    <Calendar size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">实战工作坊</h3>
                </div>
                <p className="text-foreground/60 mb-6 text-sm">
                  与行业专家一起参加实战动手课程。
                </p>

                <div className="flex-1 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-foreground/5 border border-border rounded-lg p-4 hover:bg-foreground/10 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-primary">{2 + i} 月 {10 + i} 日</span>
                        <span className="text-xs bg-foreground/10 px-2 py-0.5 rounded text-foreground/50">直播</span>
                      </div>
                      <h4 className="text-sm font-medium text-foreground group-hover:text-primary/80 transition-colors">
                        用 LangChain 构建 AI 智能体
                      </h4>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-border text-center">
                  <span className="text-xs text-foreground/40">下一期课程 2 天后开始</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gamification - Small Card (1x1) */}
          <div className="md:col-span-1 md:row-span-1 scroll-reveal-up">
            <div className="glow-border h-full w-full overflow-hidden rounded-lg">
              <div className="h-full bg-gradient-to-br from-background/40 to-primary/20 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center relative group rounded-lg">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                <div className="mb-4 p-4 rounded-full bg-warning/10 border border-warning/20 group-hover:scale-110 transition-transform duration-300">
                  <Trophy size={32} className="text-warning" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">赢取徽章</h3>
                <p className="text-xs text-foreground/50">提升你的等级</p>
              </div>
            </div>
          </div>

          {/* Community - Wide Card (2x1) */}
          <div className="md:col-span-2 md:row-span-1 scroll-reveal-up">
            <div className="glow-border h-full w-full overflow-hidden rounded-lg">
              <div className="h-full bg-background/40 backdrop-blur-sm p-6 flex flex-col justify-between relative overflow-hidden rounded-lg">
                <div className="absolute top-0 right-0 p-32 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="p-2 rounded-lg bg-destructive/20 text-destructive">
                    <Users size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">活跃社区</h3>
                </div>
                
                <div className="flex gap-4 overflow-hidden relative z-10">
                  <div className="marquee-track gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-shrink-0 w-64 bg-foreground/5 border border-border rounded-lg p-3 flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted/80" />
                        <div>
                          <p className="text-xs text-foreground font-medium">小明</p>
                          <p className="text-xs text-foreground/50 truncate w-40">刚发布了我的第一个 AI 应用！</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Assistant - Small Card (1x1) */}
          <div className="md:col-span-1 md:row-span-1 scroll-reveal-up">
            <div className="glow-border h-full w-full overflow-hidden rounded-lg">
              <div className="h-full bg-background/40 backdrop-blur-sm p-6 flex flex-col relative group rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-success/20 text-success">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">AI 助手</h3>
                </div>
                <div className="flex-1 bg-foreground/5 rounded-lg p-3 text-xs text-foreground/60 font-mono leading-relaxed">
                  &quot;今天我能如何帮你规划学习路径？&quot;
                  <span className="inline-block w-1.5 h-3 bg-success ml-1 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
