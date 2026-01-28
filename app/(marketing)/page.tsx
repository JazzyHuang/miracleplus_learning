import { Hero } from "@/components/marketing/hero";
import { BentoGrid } from "@/components/marketing/bento-grid";
import { Journey } from "@/components/marketing/journey";

export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-0">
      <Hero />
      <BentoGrid />
      <Journey />
    </div>
  );
}
