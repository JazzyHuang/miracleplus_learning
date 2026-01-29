'use client';

import { useState } from 'react';
import { Loader2, User, Camera, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPointsService } from '@/lib/points/service';
import { createBadgesService } from '@/lib/points/badges';
import { POINT_RULES } from '@/lib/points/config';

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 编辑个人资料对话框
 * 首次完善资料可获得积分奖励
 */
export function EditProfileDialog({ open, onClose, onSuccess }: EditProfileDialogProps) {
  const { user } = useUser();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 判断用户是否已完善过资料（有名字即视为已完善）
  const hasCompletedProfile = !!user?.name;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 验证文件
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('头像上传成功');
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.error('头像上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      toast.error('请输入昵称');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      // 更新用户资料
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          avatar_url: avatarUrl || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // 如果是首次完善资料，发放积分
      let pointsEarned = 0;
      if (!hasCompletedProfile && name.trim()) {
        const pointsService = createPointsService(supabase);
        const result = await pointsService.addPoints(
          user.id,
          'PROFILE_COMPLETE',
          user.id,
          'user',
          '首次完善个人资料'
        );

        if (result.success) {
          pointsEarned = result.pointsAdded;
        }

        // 检查并解锁勋章
        const badgesService = createBadgesService(supabase);
        const unlockedBadges = await badgesService.checkAndUnlockBadges(user.id);
        if (unlockedBadges.length > 0) {
          setTimeout(() => {
            unlockedBadges.forEach((badge) => {
              toast.success(
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏅</span>
                  <span>解锁勋章：{badge.name}</span>
                </div>
              );
            });
          }, 1000);
        }
      }

      // 刷新用户数据 - UserContext 不提供 refreshUser，认证状态会自动同步
      // await refreshUser?.();

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

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('保存资料失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            编辑个人资料
          </DialogTitle>
          <DialogDescription>
            完善你的个人信息，让其他学员更好地认识你
            {!hasCompletedProfile && (
              <span className="block mt-1 text-amber-500 font-medium">
                首次完善资料可获得 {POINT_RULES.PROFILE_COMPLETE} 积分！
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 头像上传 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </div>
            <p className="text-sm text-muted-foreground">点击更换头像</p>
          </div>

          {/* 昵称 */}
          <div className="space-y-2">
            <Label htmlFor="name">昵称 *</Label>
            <Input
              id="name"
              placeholder="输入你的昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/20
            </p>
          </div>

          {/* 邮箱（只读） */}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">邮箱无法修改</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                保存
                {!hasCompletedProfile && (
                  <span className="ml-2 text-xs text-amber-400">
                    +{POINT_RULES.PROFILE_COMPLETE}
                  </span>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
