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
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <div className="h-6 w-6 rounded-lg bg-foreground/10 p-1">
              <div className="h-full w-full rounded bg-foreground" />
            </div>
            <span className="hidden font-bold sm:inline-block text-foreground">
              MiraclePlus
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" asChild className="text-foreground/70 hover:text-foreground hover:bg-foreground/10 h-8 px-4 text-sm">
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild className="bg-card text-card-foreground hover:bg-card/90 h-8 px-4 text-sm font-medium">
              <Link href="/register">开始学习</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
