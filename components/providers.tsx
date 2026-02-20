'use client';

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useSyncExternalStore, type ErrorInfo, type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { UserProvider } from '@/contexts/user-context';
import { CelebrationContext } from '@/components/gamification/celebration-provider';
import { NavigationProgress } from '@/components/ui/navigation-progress';
import { reportToConsole, type WebVitalMetric } from '@/lib/performance';
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { initErrorTracking, captureException } from '@/lib/error-tracking';
import type { User } from '@/types/database';

// 性能优化：CelebrationEffects 依赖 react-rewards (~20KB)，庆祝动画是低频事件，懒加载
// 使用 React.lazy + mounted 守卫替代 next/dynamic ssr:false，避免 hydration mismatch
const CelebrationEffects = lazy(
  () => import('@/components/gamification/celebration-provider').then((m) => ({ default: m.CelebrationEffects }))
);

const KeyboardShortcutsDialog = lazy(
  () => import('@/components/common/keyboard-shortcuts-dialog').then((m) => ({ default: m.KeyboardShortcutsDialog }))
);

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

/**
 * 全局 Providers 组件
 * 包含主题、动画、用户状态、庆祝动画 Provider + ErrorBoundary
 * 
 * Provider 顺序: Theme → User → Motion → Celebration → ErrorBoundary → children
 */
/**
 * Web Vitals 监控初始化
 * 动态导入 web-vitals 库，监控 CLS/INP/FCP/LCP/TTFB
 */
function WebVitalsReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
        const report = (metric: { name: string; value: number; delta: number; id: string; navigationType: string }) => {
          reportToConsole(metric as WebVitalMetric);
        };
        onCLS(report);
        onINP(report);
        onFCP(report);
        onLCP(report);
        onTTFB(report);
      });
    }
  }, []);

  return null;
}

/**
 * 全局键盘快捷键注册
 */
function GlobalShortcutsRegistrar() {
  useGlobalShortcuts();
  return null;
}

/**
 * 用户偏好应用
 * 从 localStorage 读取字体大小和减少动画偏好，应用到 <html> 元素
 * 使用 localStorage 而非服务端渲染，避免 hydration mismatch
 */
function PreferencesApplier() {
  useEffect(() => {
    initErrorTracking();
    try {
      const fontSize = localStorage.getItem('ml-font-size');
      if (fontSize && (fontSize === 'sm' || fontSize === 'lg')) {
        document.documentElement.setAttribute('data-font-size', fontSize);
      }

      const reduceMotion = localStorage.getItem('ml-reduce-motion');
      if (reduceMotion === 'true') {
        document.documentElement.setAttribute('data-reduce-motion', 'true');
      }
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, []);

  return null;
}

export function Providers({ children, initialUser = null }: ProvidersProps) {
  // mounted 守卫：确保仅客户端渲染的组件在 hydration 后才挂载，避免 SSR/CSR 不匹配
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  // Ref-based pattern: celebrate 函数在 CelebrationEffects 加载后注入
  const celebrateRef = useRef<(type?: 'confetti' | 'emoji' | 'balloons') => void>(() => {});
  const celebrate = useCallback((type?: 'confetti' | 'emoji' | 'balloons') => {
    celebrateRef.current(type);
  }, []);
  const handleReady = useCallback((fn: (type?: 'confetti' | 'emoji' | 'balloons') => void) => {
    celebrateRef.current = fn;
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NavigationProgress />
      <UserProvider initialUser={initialUser}>
        <LazyMotion features={domAnimation} strict>
          <MotionConfig reducedMotion="user">
            <CelebrationContext.Provider value={{ celebrate }}>
              <GlobalErrorBoundary>
                {children}
                <WebVitalsReporter />
                <PreferencesApplier />
                <GlobalShortcutsRegistrar />
                {mounted && (
                  <Suspense fallback={null}>
                    <KeyboardShortcutsDialog />
                  </Suspense>
                )}
                {mounted && (
                  <Suspense fallback={null}>
                    <CelebrationEffects onReady={handleReady} />
                  </Suspense>
                )}
              </GlobalErrorBoundary>
            </CelebrationContext.Provider>
          </MotionConfig>
        </LazyMotion>
      </UserProvider>
    </ThemeProvider>
  );
}

/**
 * 全局 ErrorBoundary
 * 捕获未处理的渲染错误，提供友好的恢复UI。
 */
class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, {
      source: 'GlobalErrorBoundary',
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground">出了点问题</h2>
            <p className="text-sm text-muted-foreground">
              {process.env.NODE_ENV === 'development'
                ? this.state.error?.message || '页面遇到了一个错误'
                : '页面遇到了一个错误，请重新加载'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
