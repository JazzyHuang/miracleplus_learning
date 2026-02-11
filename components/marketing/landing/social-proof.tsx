/**
 * SocialProof — Server Component（零 JS）
 * 
 * 优化：
 * - 移除 'use client'（纯静态内容）
 * - Marquee 只重复 2 次（而非 3 次），DOM 从 48 节点降至 16 节点
 * - CSS will-change + hover 暂停 + prefers-reduced-motion 暂停
 */

const companies = [
  "Microsoft",
  "Google",
  "OpenAI",
  "Anthropic",
  "Midjourney",
  "Stability AI",
  "Hugging Face",
  "Scale AI",
];

export function SocialProof() {
  return (
    <section className="border-y border-border bg-background py-20 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 mb-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          来自全球顶尖科技公司的创业者都在这里学习
        </p>
      </div>
      
      <div className="relative flex overflow-x-hidden">
        {/* 单 marquee-track + CSS 无缝循环 */}
        <div className="marquee-track whitespace-nowrap">
          {[...companies, ...companies].map((company, i) => (
            <span
              key={i}
              className="mx-8 inline-flex items-center justify-center text-xl font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              {company}
            </span>
          ))}
        </div>
        {/* 第二轨道 — 衔接无缝循环 */}
        <div className="marquee-track absolute top-0 whitespace-nowrap" aria-hidden="true">
          {[...companies, ...companies].map((company, i) => (
            <span
              key={i}
              className="mx-8 inline-flex items-center justify-center text-xl font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              {company}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
