'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/workshop/image-upload';
import { updateProfileAction } from '@/app/actions/settings';
import { awardPointsAction, checkBadgesAction } from '@/app/actions/points';
import { profileSettingsSchema, type ProfileSettingsData } from '@/lib/validations';
import { POINT_RULES } from '@/lib/points/config';
import { useUser } from '@/contexts/user-context';
import type { User } from '@/types/database';

interface ProfileSectionProps {
  user: User;
  bio: string;
  userEmail: string;
}

export function ProfileSection({ user, bio, userEmail }: ProfileSectionProps) {
  const { user: contextUser } = useUser();
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const hasCompletedProfile = !!user.name;

  const form = useForm<ProfileSettingsData>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: user.name || '',
      bio: bio || '',
      avatar_url: user.avatar_url || '',
    },
  });

  // Sync with context updates
  useEffect(() => {
    if (contextUser) {
      form.reset({
        name: contextUser.name || '',
        bio: (contextUser as User).bio || bio || '',
        avatar_url: contextUser.avatar_url || '',
      });
      setAvatarUrl(contextUser.avatar_url || '');
    }
  }, [contextUser, bio, form]);

  useEffect(() => {
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    };
  }, []);

  const onSubmit = async (data: ProfileSettingsData) => {
    setSaving(true);
    try {
      const result = await updateProfileAction({
        name: data.name,
        bio: data.bio,
        avatar_url: avatarUrl,
      });

      if (!result.success) {
        toast.error(result.error || '保存失败');
        return;
      }

      // 首次完善资料积分奖励
      let pointsEarned = 0;
      if (!hasCompletedProfile && data.name.trim()) {
        const pointResult = await awardPointsAction(
          'PROFILE_COMPLETE',
          user.id,
          'user',
          '首次完善个人资料'
        );
        if (pointResult.success) {
          pointsEarned = pointResult.pointsAdded;
        }

        const unlockedBadges = await checkBadgesAction();
        if (unlockedBadges.length > 0) {
          badgeTimerRef.current = setTimeout(() => {
            unlockedBadges.forEach((badge) => {
              toast.success(`解锁勋章：${badge.name}`);
            });
          }, 1000);
        }
      }

      if (pointsEarned > 0) {
        toast.success(
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>资料保存成功！获得 {pointsEarned} 积分</span>
          </div>
        );
      } else {
        toast.success('资料保存成功');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const nameValue = form.watch('name');
  const bioValue = form.watch('bio');

  return (
    <Card>
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
        <CardDescription>
          更新你的个人信息
          {!hasCompletedProfile && (
            <span className="block mt-1 text-amber-500 font-medium">
              首次完善资料可获得 {POINT_RULES.PROFILE_COMPLETE} 积分
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 头像 */}
          <div className="space-y-2">
            <Label>头像</Label>
            <ImageUpload
              onUpload={(url) => setAvatarUrl(url)}
              existingUrl={avatarUrl}
              folder="avatars"
              autoUpload
              compact
              maxSize={2 * 1024 * 1024}
            />
          </div>

          {/* 昵称 */}
          <div className="space-y-2">
            <Label htmlFor="name">昵称</Label>
            <Input
              id="name"
              placeholder="输入你的昵称"
              maxLength={20}
              {...form.register('name')}
            />
            <div className="flex justify-between">
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {nameValue?.length || 0}/20
              </p>
            </div>
          </div>

          {/* 个人简介 */}
          <div className="space-y-2">
            <Label htmlFor="bio">个人简介</Label>
            <Textarea
              id="bio"
              placeholder="介绍一下你自己..."
              maxLength={200}
              rows={3}
              {...form.register('bio')}
            />
            <div className="flex justify-between">
              {form.formState.errors.bio && (
                <p className="text-xs text-destructive">{form.formState.errors.bio.message}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {bioValue?.length || 0}/200
              </p>
            </div>
          </div>

          {/* 邮箱（只读） */}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              value={userEmail}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">邮箱地址无法修改</p>
          </div>

          <Button type="submit" loading={saving}>
            保存
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
