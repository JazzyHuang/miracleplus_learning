"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/ai-tools", label: "AI 体验台" },
    { href: "/courses", label: "线上资源" },
    { href: "/workshop", label: "实战工作坊" },
    { href: "/leaderboard", label: "排行榜" },
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <div className="h-6 w-6 rounded-lg bg-white/10 p-1">
              <div className="h-full w-full rounded bg-white" />
            </div>
            <span className="hidden font-bold sm:inline-block text-white">
              MiraclePlus
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-white/80",
                  pathname === link.href ? "text-white" : "text-white/60"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Link href="/login">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-4 text-sm">
                登录
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-white/90 h-8 px-4 text-sm font-medium">
                开始学习
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
