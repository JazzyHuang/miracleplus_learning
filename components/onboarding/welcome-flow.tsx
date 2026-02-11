'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { BookOpen, Trophy, Users, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-context';

const ONBOARDING_KEY = 'ml-onboarding-completed';

interface WelcomeFlowProps {
  /** 是否强制显示（用于测试） */
  forceShow?: boolean;
}

/**
 * 新用户引导流程
 * 
 * 首次登录显示欢迎弹窗，介绍平台核心功能。
 * 使用 localStorage 标记完成状态，只显示一次。
 */
export function WelcomeFlow({ forceShow = false }: WelcomeFlowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) return undefined;

    if (forceShow) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
      return undefined;
    }

    // 检查是否已完成引导
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        // 延迟显示，等页面渲染完成
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage 不可用时静默跳过
    }
    return undefined;
  }, [user, forceShow]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // 静默处理
    }
  }, []);

  const handleExplore = useCallback(() => {
    handleClose();
    router.push('/courses');
  }, [handleClose, router]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-2xl border border-border/50 bg-card p-8 shadow-2xl shadow-sm"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-card-foreground"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex rounded-full bg-primary/10 p-3">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-card-foreground">
                欢迎加入 Miracle Learning!
              </h2>
              <p className="text-sm text-muted-foreground">
                {user.name ? `${user.name}，` : ''}开启你的 AI 学习之旅
              </p>
            </div>

            {/* Feature cards */}
            <div className="mb-6 space-y-3">
              <FeatureCard
                icon={<BookOpen className="h-5 w-5" />}
                title="课程学习"
                description="系统学习 AI 知识，完成课程获得积分"
                color="indigo"
              />
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="Workshop 实践"
                description="参加 Workshop，提交作品，和同伴交流"
                color="violet"
              />
              <FeatureCard
                icon={<Trophy className="h-5 w-5" />}
                title="成长激励"
                description="积累积分和勋章，解锁 AI 观察员 → 实践家 → 领航员"
                color="amber"
              />
            </div>

            {/* Profile completion prompt */}
            {(!user.name || !user.avatar_url) && (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm text-card-foreground/80">
                  💡 完善个人资料可获得 <span className="font-medium text-primary">20 积分</span> 奖励！
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={handleClose}
              >
                稍后探索
              </Button>
              <Button
                variant="brand"
                className="flex-1 gap-2"
                onClick={handleExplore}
              >
                开始学习
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'indigo' | 'violet' | 'amber';
}) {
  const colorMap = {
    indigo: 'from-primary/10 to-primary/5 border-primary/20 text-primary',
    violet: 'from-primary/10 to-primary/5 border-primary/20 text-primary',
    amber: 'from-primary/10 to-primary/5 border-primary/20 text-primary',
  };

  return (
    <div className={`flex items-start gap-3 rounded-xl border bg-gradient-to-r p-3 ${colorMap[color]}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-card-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/**
 * 个人资料完善提示 Banner
 * 
 * 在用户资料不完整时显示在页面顶部，引导完善。
 */
export function ProfileCompletionBanner() {
  const { user } = useUser();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const hidden = localStorage.getItem('ml-profile-banner-dismissed');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (hidden) setDismissed(true);
    } catch {
      // 静默处理
    }
  }, []);

  if (!user || dismissed) return null;

  // 计算完善度
  const fields = [user.name, user.avatar_url, (user as unknown as Record<string, unknown>).bio];
  const completed = fields.filter(Boolean).length;
  const total = fields.length;

  if (completed >= total) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 md:mx-6"
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-foreground/80">
        完善个人资料可获得 <span className="font-medium text-primary">20 积分</span>！
        <span className="ml-1 text-foreground/50">({completed}/{total} 已完成)</span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-xs"
        onClick={() => router.push('/profile')}
      >
        去完善
      </Button>
      <button
        onClick={() => {
          setDismissed(true);
          try { localStorage.setItem('ml-profile-banner-dismissed', 'true'); } catch { /* ignore */ }
        }}
        className="shrink-0 rounded p-1 text-foreground/40 transition-colors hover:text-foreground/70"
        aria-label="关闭提示"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </m.div>
  );
}
