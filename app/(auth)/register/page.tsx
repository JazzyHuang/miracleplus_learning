'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, Info } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { registerAction } from '@/app/actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRedirectHint, setShowRedirectHint] = useState(false);

  // 从 URL 获取预填充的邮箱
  const prefilledEmail = searchParams.get('email') || '';

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

  // 如果有预填充邮箱（从登录页跳转过来），显示提示
  useEffect(() => {
    if (prefilledEmail) {
      setValue('email', prefilledEmail);
      setShowRedirectHint(true);
    }
  }, [prefilledEmail, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    // 使用 Server Action 进行注册（带 Rate Limiting）
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

    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="border border-border shadow-medium">
            <CardContent className="pt-10 pb-10 text-center">
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto w-16 h-16 bg-foreground rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-8 h-8 text-background" />
              </m.div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">注册成功！</h2>
              <p className="text-muted-foreground mb-6">
                请查看您的邮箱并点击验证链接完成注册
              </p>
              <Button onClick={() => router.push('/login')}>
                前往登录
              </Button>
            </CardContent>
          </Card>
        </m.div>
      </div>
    );
  }

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
                创建账号
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                加入奇绩创坛学习平台
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {showRedirectHint && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
              >
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    <p className="font-medium">您的邮箱尚未注册</p>
                    <p className="text-xs mt-1 opacity-80">
                      请填写以下信息创建新账号
                    </p>
                  </div>
                </div>
              </m.div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="您的姓名"
                  {...register('name')}
                  className="h-11"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className="h-11"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              {error && (
                <m.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
                >
                  {error}
                </m.p>
              )}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  '注册'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              已有账号？{' '}
              <Link
                href="/login"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                立即登录
              </Link>
            </p>
          </CardFooter>
        </Card>
      </m.div>
    </div>
  );
}
