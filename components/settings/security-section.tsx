'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePasswordSchema, type ChangePasswordData } from '@/lib/validations';
import { changePasswordAction } from '@/app/actions/settings';

interface SecuritySectionProps {
  email: string;
  hasPasswordAuth: boolean;
}

export function SecuritySection({ email, hasPasswordAuth }: SecuritySectionProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordData) => {
    setSaving(true);
    try {
      const result = await changePasswordAction(data);
      if (!result.success) {
        if (result.rateLimited) {
          toast.error(result.error);
        } else {
          toast.error(result.error || '密码修改失败');
        }
        return;
      }
      toast.success('密码修改成功');
      form.reset();
    } catch {
      toast.error('密码修改失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 邮箱信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            邮箱地址
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">{email}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">邮箱地址无法修改</p>
        </CardContent>
      </Card>

      {/* 密码修改 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            修改密码
          </CardTitle>
          <CardDescription>
            {hasPasswordAuth
              ? '定期修改密码可以提高账户安全性'
              : '你使用第三方账号登录，无需设置密码'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPasswordAuth ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">当前密码</Label>
                <PasswordInput
                  id="currentPassword"
                  placeholder="输入当前密码"
                  {...form.register('currentPassword')}
                />
                {form.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder="输入新密码"
                  {...form.register('newPassword')}
                />
                {form.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="再次输入新密码"
                  {...form.register('confirmPassword')}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  密码至少8个字符，需包含大写字母、小写字母和数字
                </p>
              </div>

              <Button type="submit" loading={saving}>
                修改密码
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                你使用第三方账号登录，无需设置密码
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
