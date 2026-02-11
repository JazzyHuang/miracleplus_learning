'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Sparkles, CheckCircle2, Info, ArrowRight, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { registerAction } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/client';

/** 重发验证邮件的冷却时间（秒） */
const RESEND_COOLDOWN = 60;

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const prefilledEmail = searchParams.get('email') || '';
  const showRedirectHint = !!prefilledEmail;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: prefilledEmail,
    },
  });

  useEffect(() => {
    if (prefilledEmail) {
      setValue('email', prefilledEmail);
    }
  }, [prefilledEmail, setValue]);

  // 重发冷却倒计时
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = async (data: RegisterFormData) => {
    // 防抖修复：防止重复提交
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    const result = await registerAction({
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });

    if (!result.success) {
      setError(result.error || '注册失败');
      setIsLoading(false);
      return;
    }

    setRegisteredEmail(data.email);
    setSuccess(true);
    setIsLoading(false);
  };

  // 重新发送验证邮件
  const handleResendEmail = useCallback(async () => {
    if (resendCooldown > 0 || !registeredEmail) return;
    
    setResendMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      });
      
      if (error) {
        setResendMessage('发送失败，请稍后再试');
      } else {
        setResendMessage('验证邮件已重新发送，请查看收件箱');
        setResendCooldown(RESEND_COOLDOWN);
      }
    } catch {
      setResendMessage('发送失败，请稍后再试');
    }
  }, [resendCooldown, registeredEmail]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-[400px]"
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-success/20 via-success/30 to-success/20 rounded-2xl blur-xl opacity-50" />
            
            <div className="relative bg-secondary backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl text-center">
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-6"
              >
                <CheckCircle2 className="w-8 h-8 text-white" />
              </m.div>
              
              <m.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-semibold text-foreground mb-2"
              >
                请查看邮箱
              </m.h2>
              
              <m.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-3 mb-6"
              >
                <p className="text-muted-foreground">
                  如果该邮箱未被注册，您将收到一封验证邮件。
                </p>
                <div className="flex items-start gap-2 text-left p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <Mail className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning/90">
                    请检查收件箱和垃圾邮件文件夹。验证链接有效期为 24 小时。
                  </p>
                </div>
              </m.div>

              {/* 重发验证邮件 */}
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <button
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0}
                  className="w-full h-10 text-sm border border-border text-muted-foreground rounded-lg hover:bg-white/5 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0
                    ? `${resendCooldown} 秒后可重新发送`
                    : '重新发送验证邮件'}
                </button>

                {resendMessage && (
                  <p className={`text-xs ${resendMessage.includes('失败') ? 'text-destructive' : 'text-success'}`}>
                    {resendMessage}
                  </p>
                )}

                <button
                  onClick={() => router.push('/login')}
                  className="w-full h-12 bg-card text-card-foreground font-medium rounded-lg hover:bg-accent transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  前往登录
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </m.div>
            </div>
          </div>
        </m.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[400px]"
      >
        {/* Back button */}
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

        {/* Glass Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-foreground/5 via-foreground/10 to-foreground/5 rounded-2xl blur-xl opacity-50" />
          
          <div className="relative bg-secondary backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <m.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="mx-auto w-14 h-14 bg-card rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-6"
              >
                <Sparkles className="w-7 h-7 text-card-foreground" />
              </m.div>
              <m.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-semibold text-foreground tracking-tight"
              >
                创建账号
              </m.h1>
              <m.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-muted-foreground text-sm mt-2"
              >
                加入 Miracle Learning 学习平台
              </m.p>
            </div>

            {/* Redirect hint */}
            {showRedirectHint && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">您的邮箱尚未注册</p>
                    <p className="text-xs text-primary/70 mt-1">
                      请填写以下信息创建新账号
                    </p>
                  </div>
                </div>
              </m.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <m.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                  姓名
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="您的姓名"
                  {...register('name')}
                  className="w-full h-12 px-4 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all duration-200"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </m.div>

              <m.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-2"
              >
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register('email')}
                  className="w-full h-12 px-4 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all duration-200"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </m.div>

              <m.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full h-12 px-4 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all duration-200"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </m.div>

              <m.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="space-y-2"
              >
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className="w-full h-12 px-4 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all duration-200"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </m.div>

              {error && (
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <p className="text-destructive">{error}</p>
                </m.div>
              )}

              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-card text-card-foreground font-medium rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    <>
                      创建账号
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
              transition={{ delay: 0.55 }}
              className="mt-6 pt-6 border-t border-border text-center"
            >
              <p className="text-sm text-muted-foreground">
                已有账号？{' '}
                <Link
                  href="/login"
                  className="text-foreground hover:text-muted-foreground font-medium transition-colors"
                >
                  立即登录
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
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Miracle Learning · 奇绩创坛学习平台
        </m.p>
      </m.div>
    </div>
  );
}
