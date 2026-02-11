import type { Metadata } from 'next';
import { Spotlight } from '@/components/marketing/landing/spotlight';
import { SkipLink } from '@/components/ui/skip-link';

// SEO: Prevent search engines from indexing auth pages
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Skip link for keyboard navigation */}
      <SkipLink targetId="main-content" />

      {/* Spotlight effects */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="hsl(var(--foreground) / 0.03)"
      />

      {/* Subtle gradient orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <main id="main-content" className="relative z-10" role="main" aria-label="认证表单">
        {children}
      </main>
    </div>
  );
}
