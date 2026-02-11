'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { loginAction } from '@/app/actions/auth';

/**
 * 登录页面（Suspense 包裹，因为使用了 useSearchParams）
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}

/** 加载骨架屏 */
function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="relative bg-card border border-border/50 rounded-2xl p-8 shadow-elevated">
          <div className="animate-pulse space-y-6">
            <div className="mx-auto w-14 h-14 bg-muted rounded-xl" />
            <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
            <div className="space-y-4">
              <div className="h-12 bg-muted rounded-xl" />
              <div className="h-12 bg-muted rounded-xl" />
              <div className="h-12 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  // 读取 URL 中的 error 参数（来自 auth callback 重定向）
  const callbackError = searchParams.get('error');
  const [error, setError] = useState<string | null>(callbackError || null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // 防抖修复：防止重复提交
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const result = await loginAction({
      email: data.email,
      password: data.password,
    });

    if (!result.success) {
      setError(result.error || '登录失败');
      setIsLoading(false);
      return;
    }

    // 登录成功后使用完整页面刷新（而非客户端导航）
    // 这样确保 UserProvider 能正确获取到新 session
    window.location.assign('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[400px]"
      >
        {/* Back to home */}
        <m.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </m.div>

        {/* White Card floating on deep navy */}
        <div className="relative">
          <div className="relative bg-card border border-border/50 rounded-2xl p-8 shadow-elevated">
            {/* Logo */}
            <div className="text-center mb-8">
              <m.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="mx-auto w-14 h-14 gradient-brand rounded-xl flex items-center justify-center shadow-theme-md mb-6"
              >
                <Sparkles className="w-7 h-7 text-white" />
              </m.div>
              <m.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-medium text-card-foreground tracking-tight"
              >
                欢迎回来
              </m.h1>
              <m.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-muted-foreground text-sm mt-2"
              >
                登录到 Miracle Learning
              </m.p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <m.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <label htmlFor="email" className="block text-sm font-medium text-card-foreground/70">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={!!errors.email}
                  {...register('email')}
                  className="w-full h-12 px-4 bg-muted/30 border border-border rounded-xl text-card-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all duration-200"
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive" role="alert">{errors.email.message}</p>
                )}
              </m.div>

              <m.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-2"
              >
                <label htmlFor="password" className="block text-sm font-medium text-card-foreground/70">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-describedby={errors.password ? "password-error" : undefined}
                  aria-invalid={!!errors.password}
                  {...register('password')}
                  className="w-full h-12 px-4 bg-muted/30 border border-border rounded-xl text-card-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all duration-200"
                />
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive" role="alert">{errors.password.message}</p>
                )}
              </m.div>

              {error && (
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm p-4 rounded-xl bg-destructive/10 border border-destructive/20"
                  role="alert"
                >
                  <p className="text-destructive">{error}</p>
                </m.div>
              )}

              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  type="submit"
                  disabled={isLoading || isSubmitting}
                  aria-busy={isLoading}
                  className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 hover:shadow-theme-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    <>
                      登录
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </m.div>
            </form>

            {/* Footer */}
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 pt-6 border-t border-border/50 text-center"
            >
              <p className="text-sm text-muted-foreground">
                还没有账号？{' '}
                <Link
                  href="/register"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  立即注册
                </Link>
              </p>
            </m.div>
          </div>
        </div>

        {/* Brand text */}
        <m.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-foreground/30 mt-8"
        >
          Miracle Learning · 奇绩创坛学习平台
        </m.p>
      </m.div>
    </div>
  );
}
