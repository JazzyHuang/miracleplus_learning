import type { Metadata } from "next";
import { Hero } from "@/components/marketing/landing/hero";
import { Features } from "@/components/marketing/landing/features";
import { SocialProof } from "@/components/marketing/landing/social-proof";
import { CTA } from "@/components/marketing/landing/cta";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

export const metadata: Metadata = {
  title: 'Miracle Learning | 奇绩创坛学习平台 — 成为 AI 时代的领航者',
  description: '奇绩创坛 AI 学习平台，提供系统化创业课程、Workshop 线下活动、AI 工具体验台，与优秀创业者一起成长',
  keywords: ['AI 学习', '创业课程', 'Workshop', '奇绩创坛', '创业培训', 'AI 工具'],
  openGraph: {
    title: 'Miracle Learning — 成为 AI 时代的领航者',
    description: '系统化学习创业知识，与优秀创业者一起成长',
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
      <SocialProof />
      <Features />
      <CTA />
    </div>
  );
}
