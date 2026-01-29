"use client";

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
    <section className="border-y border-white/5 bg-black py-10 overflow-hidden">
      <div className="container mx-auto px-4 mb-8 text-center">
        <p className="text-sm font-medium text-zinc-500">
          来自全球顶尖科技公司的创业者都在这里学习
        </p>
      </div>
      
      <div className="relative flex overflow-x-hidden group">
        <div className="animate-marquee flex whitespace-nowrap">
          {companies.concat(companies).concat(companies).map((company, i) => (
            <div
              key={i}
              className="mx-8 flex items-center justify-center text-xl font-bold text-zinc-700 transition-colors hover:text-white"
            >
              {company}
            </div>
          ))}
        </div>
        
        <div className="absolute top-0 animate-marquee2 flex whitespace-nowrap">
           {companies.concat(companies).concat(companies).map((company, i) => (
            <div
              key={i}
              className="mx-8 flex items-center justify-center text-xl font-bold text-zinc-700 transition-colors hover:text-white"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
