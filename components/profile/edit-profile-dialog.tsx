'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
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
import { ImageUpload } from '@/components/workshop/image-upload';
import { awardPointsAction } from '@/app/actions/points';
import { POINT_RULES } from '@/lib/points/config';
import { useBadgeCheck } from '@/hooks/use-badge-check';
import { logger } from '@/lib/logger';

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
  const { checkBadges } = useBadgeCheck();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    };
  }, []);

  // 性能修复：当 user prop 变化时（如 context 更新），同步表单状态
  useEffect(() => {
    if (open && user) {
      setName(user.name || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [open, user]);

  // 判断用户是否已完善过资料（有名字即视为已完善）
  const hasCompletedProfile = !!user?.name;

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
        .from(DB.users)
        .update({
          name: name.trim(),
          avatar_url: avatarUrl || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // 如果是首次完善资料，发放积分（通过 Server Action）
      let pointsEarned = 0;
      if (!hasCompletedProfile && name.trim()) {
        const result = await awardPointsAction(
          'PROFILE_COMPLETE',
          user.id,
          'user',
          '首次完善个人资料'
        );

        if (result.success) {
          pointsEarned = result.pointsAdded;
        }

        // 徽章检查 — fire-and-forget
        checkBadges();
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
      logger.error('保存资料失败:', error);
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
          <ImageUpload
            onUpload={(url) => setAvatarUrl(url)}
            existingUrl={avatarUrl}
            folder="avatars"
            autoUpload
            compact
            maxSize={2 * 1024 * 1024}
          />

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
