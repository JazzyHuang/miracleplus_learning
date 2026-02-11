"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { useUser, useUserLoading } from "@/contexts/user-context";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // 复用UserContext中的用户状态，避免重复查询
  const { user } = useUser();
  const loading = useUserLoading();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        scrolled
          ? "bg-background/50 backdrop-blur-xl border-border py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-foreground font-bold text-lg shadow-theme-sm group-hover:shadow-theme-md transition-shadow duration-300">
            M
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
            Miracle Learning
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="#journey"
            className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
          >
            Journey
          </Link>
          <Link
            href="#community"
            className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
          >
            Community
          </Link>

          {/* 根据登录状态显示不同按钮 */}
          {!loading &&
            (user ? (
              // 已登录：显示进入控制台按钮
              <Button
                asChild
                size="sm"
                className="bg-card text-card-foreground hover:bg-card/90 rounded-full px-6 font-medium"
              >
                <Link href="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  进入控制台
                </Link>
              </Button>
            ) : (
              // 未登录：显示登录和注册按钮
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="bg-card text-card-foreground hover:bg-card/90 rounded-full px-6 font-medium"
                >
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            ))}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-foreground/70 hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
        >
          {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border p-4 flex flex-col gap-4 animate-in slide-in-from-top-5"
          aria-label="移动端导航"
        >
          <Link
            href="#features"
            className="text-base font-medium text-foreground/70 hover:text-foreground py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Features
          </Link>
          <Link
            href="#journey"
            className="text-base font-medium text-foreground/70 hover:text-foreground py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Journey
          </Link>
          <Link
            href="#community"
            className="text-base font-medium text-foreground/70 hover:text-foreground py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Community
          </Link>
          <div className="h-px bg-foreground/10 my-2" />

          {/* 根据登录状态显示不同按钮 */}
          {!loading &&
            (user ? (
              // 已登录：显示进入控制台按钮
              <Button
                asChild
                className="w-full bg-card text-card-foreground hover:bg-card/90 rounded-full"
              >
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  进入控制台
                </Link>
              </Button>
            ) : (
              // 未登录：显示登录和注册按钮
              <>
                <Link
                  href="/login"
                  className="text-base font-medium text-foreground/70 hover:text-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Button
                  asChild
                  className="w-full bg-card text-card-foreground hover:bg-card/90 rounded-full"
                >
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </>
            ))}
        </nav>
      )}
    </header>
  );
}
