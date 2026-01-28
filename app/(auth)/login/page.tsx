'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, UserPlus } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { loginAction } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUserNotFound, setIsUserNotFound] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // 当用户未注册时，倒计时后自动跳转到注册页面
  useEffect(() => {
    if (!isUserNotFound) return;

    if (countdown <= 0) {
      // 跳转到注册页面，并携带邮箱参数
      const email = getValues('email');
      router.push(`/register?email=${encodeURIComponent(email)}`);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isUserNotFound, countdown, router, getValues]);

  // 立即跳转到注册页面
  const goToRegister = useCallback(() => {
    const email = getValues('email');
    router.push(`/register?email=${encodeURIComponent(email)}`);
  }, [router, getValues]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setIsUserNotFound(false);

    // 使用 Server Action 进行登录（带 Rate Limiting）
    const result = await loginAction({
      email: data.email,
      password: data.password,
    });

    if (!result.success) {
      setError(result.error || '登录失败');
      
      // 如果是用户未注册，设置状态并准备跳转
      if (result.errorCode === 'USER_NOT_FOUND') {
        setIsUserNotFound(true);
        setCountdown(3);
      }
      
      setIsLoading(false);
      return;
    }

    // 登录成功：先刷新路由确保服务器端状态更新
    // 然后等待一小段时间让 cookie 同步完成，再跳转到首页
    router.refresh();
    // 延迟跳转，给 cookie 同步和客户端状态更新留时间
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="border border-border shadow-medium">
          <CardHeader className="space-y-4 text-center pb-2">
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="mx-auto w-14 h-14 bg-foreground rounded-xl flex items-center justify-center"
            >
              <Sparkles className="w-7 h-7 text-background" />
            </m.div>
            <div>
              <CardTitle className="text-2xl font-semibold text-foreground">
                Miracle Learning
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                奇绩创坛学习平台
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register('email')}
                  className="h-11"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="h-11"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              {error && (
                <m.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-sm p-3 rounded-lg ${
                    isUserNotFound 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                      : 'text-destructive bg-destructive/10'
                  }`}
                >
                  <p>{error}</p>
                  {isUserNotFound && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs">
                        {countdown > 0 
                          ? `将在 ${countdown} 秒后自动跳转到注册页面...` 
                          : '正在跳转...'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={goToRegister}
                        className="w-full border-amber-500/30 hover:bg-amber-500/10"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        立即前往注册
                      </Button>
                    </div>
                  )}
                </m.div>
              )}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link
                href="/register"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                立即注册
              </Link>
            </p>
          </CardFooter>
        </Card>
      </m.div>
    </div>
  );
}
