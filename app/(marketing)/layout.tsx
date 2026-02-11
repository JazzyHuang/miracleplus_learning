import { Navbar } from "@/components/marketing/landing/navbar";
import { Footer } from "@/components/marketing/landing/footer";
import { SkipLink } from "@/components/ui/skip-link";

/**
 * 营销页布局 — Learn About 风格
 *
 * 深海军蓝背景 + 白色内容卡片
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Skip link for keyboard navigation */}
      <SkipLink targetId="main-content" />
      <Navbar />
      <main id="main-content" className="relative overflow-hidden" role="main" aria-label="主要内容">
        {children}
      </main>
      <Footer />
    </div>
  );
}
