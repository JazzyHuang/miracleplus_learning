import { Hero } from "@/components/marketing/landing/hero";
import { Features } from "@/components/marketing/landing/features";
import { SocialProof } from "@/components/marketing/landing/social-proof";
import { CTA } from "@/components/marketing/landing/cta";

export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-0 bg-black">
      <Hero />
      <SocialProof />
      <Features />
      <CTA />
    </div>
  );
}
