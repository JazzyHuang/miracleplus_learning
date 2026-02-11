'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA 安装提示组件
 *
 * 智能显示逻辑：
 * 1. 检查是否已安装（standalone 模式）
 * 2. 基于访问次数显示：
 *    - 第 1-2 次访问：不显示
 *    - 第 3 次访问：显示提示
 *    - 用户关闭后 7 天内不显示
 * 3. 用户接受安装后永久不显示
 *
 * 访问次数记录在 sessionStorage 中（会话级别）
 */
const MIN_VISITS_BEFORE_PROMPT = 3;
const DISMISSAL_DAYS = 7;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 检查是否已经安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // 检查用户是否已接受安装
    if (localStorage.getItem('pwa-install-accepted') === 'true') {
      return;
    }

    // 检查是否已被关闭
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISSAL_DAYS) {
        return;
      }
    }

    // 获取并增加访问次数
    const visitCount = parseInt(sessionStorage.getItem('pwa-visit-count') || '0', 10) + 1;
    sessionStorage.setItem('pwa-visit-count', visitCount.toString());

    // 访问次数不足，不显示
    if (visitCount < MIN_VISITS_BEFORE_PROMPT) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // 用户已经访问足够次数，延迟显示提示
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      // 用户接受安装，记录下来永久不显示
      localStorage.setItem('pwa-install-accepted', 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 记录关闭时间，7 天内不再显示
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <Card className="border-0 shadow-theme-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-brand-secondary flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">安装 Miracle Learning</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  添加到主屏幕，获得离线访问和更快的体验
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall}>
                    <Download className="w-4 h-4 mr-2" />
                    安装
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    稍后再说
                  </Button>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 -mt-1 -mr-1"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </m.div>
    </AnimatePresence>
  );
}
