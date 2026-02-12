/**
 * CommunityHighlights — Server Component（零 JS）
 *
 * 替代原 SocialProof 板块，展示平台真实的游戏化体系数据。
 * 数据来源：lib/points/config.ts (USER_LEVELS, PointActionType), lib/points/quests.ts (DAILY_QUEST_COUNT)
 */

import { Flame, Layers, ListChecks } from "lucide-react";

const highlights = [
  {
    icon: Layers,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    value: "3 级成长体系",
    description: "从 AI 观察员到实践家，再到领航员",
  },
  {
    icon: Flame,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    value: "50+ 成长行为",
    description: "学课程、做工坊、评工具、写心得都能获得积分",
  },
  {
    icon: ListChecks,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/10 border-green-500/20",
    value: "每日任务",
    description: "每天 3 个随机任务，完成全部额外奖励",
  },
];

export function CommunityHighlights() {
  return (
    <section className="border-y border-border bg-background py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4 max-w-screen-xl">
        <div className="text-center mb-12 scroll-reveal-up">
          <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 text-2xl font-bold md:text-3xl">
            奇绩社区，一起成长
          </h2>
          <p className="mt-3 text-muted-foreground">
            属于奇绩创坛实习生与校友的学习空间
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 scroll-stagger">
          {highlights.map((item) => (
            <div
              key={item.value}
              className="scroll-reveal-up text-center p-8 rounded-xl border border-border bg-secondary/50 spotlight-effect"
            >
              <div className={`mx-auto mb-4 h-10 w-10 rounded-lg border ${item.iconBg} flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <div className="text-2xl font-bold text-foreground md:text-3xl">
                {item.value}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
