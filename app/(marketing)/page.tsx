import type { Metadata } from "next";
import { Hero } from "@/components/marketing/landing/hero";
import { Features } from "@/components/marketing/landing/features";
import { CommunityHighlights } from "@/components/marketing/landing/community-highlights";
import { CTA } from "@/components/marketing/landing/cta";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

export const metadata: Metadata = {
  title: 'Miracle Learning | 奇绩创坛学习平台 — 成为 AI 时代的领航者',
  description: '奇绩创坛内部 AI 学习平台，为实习生与校友提供系统化课程、实战工作坊与 AI 工具体验',
  keywords: ['AI 学习', '系统化课程', 'Workshop', '奇绩创坛', '内部学习', 'AI 工具'],
  openGraph: {
    title: 'Miracle Learning — 成为 AI 时代的领航者',
    description: '奇绩创坛社区专属的 AI 学习与成长平台',
    type: 'website',
    url: BASE_URL,
  },
  alternates: {
    canonical: '/',
  },
};

export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-0 bg-background">
      <Hero />
      <CommunityHighlights />
      <Features />
      <CTA />
    </div>
  );
}
