'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Check, Lock, Star, Award } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { getBadgeImage, getBadgeTierRingStyle } from '@/lib/points/badge-assets';
import { getBadgeTierInfo } from '@/lib/points/badges';
import type { BadgeProgress } from '@/lib/points/badges';
import { cn } from '@/lib/utils';

interface BadgeDetailModalProps {
  badgeProgress: BadgeProgress | null;
  open: boolean;
  onClose: () => void;
}

/**
 * 徽章详情弹窗
 * - 大尺寸徽章图片 + 等级光环
 * - 进度条（未解锁）或解锁日期（已解锁）
 * - 积分奖励信息
 */
export function BadgeDetailModal({ badgeProgress, open, onClose }: BadgeDetailModalProps) {
  if (!badgeProgress) return null;

  const { badge, isUnlocked, unlockedAt, currentProgress, requiredProgress, progressPercent } = badgeProgress;
  const tierInfo = getBadgeTierInfo(badge.tier);
  const tierRing = getBadgeTierRingStyle(badge.tier);
  const imageSrc = getBadgeImage(badge.code, 128);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{badge.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Large badge image */}
          <div
            className={cn(
              'w-24 h-24 rounded-full overflow-hidden flex items-center justify-center',
              !isUnlocked && 'grayscale opacity-50',
              isUnlocked && `ring-2 ${tierRing.ringColor} ${tierRing.glowShadow}`,
            )}
          >
            {imageSrc ? (
              <Image src={imageSrc} alt={badge.name} width={96} height={96} />
            ) : (
              <div className={cn(
                'w-full h-full flex items-center justify-center',
                isUnlocked
                  ? badge.tier === 3
                    ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                    : badge.tier === 2
                      ? 'bg-gradient-to-br from-slate-300 to-gray-400'
                      : 'bg-gradient-to-br from-orange-300 to-amber-400'
                  : 'bg-muted',
              )}>
                {isUnlocked ? (
                  <Award className="w-10 h-10 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Tier badge */}
          <BadgeUI
            variant="outline"
            style={{ borderColor: tierInfo.color, color: tierInfo.color }}
          >
            {tierInfo.name}级勋章
          </BadgeUI>

          {/* Description */}
          {badge.description && (
            <p className="text-sm text-muted-foreground text-center">{badge.description}</p>
          )}

          {/* Progress or unlock date */}
          {isUnlocked ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="w-4 h-4" />
              {unlockedAt && format(new Date(unlockedAt), 'yyyy年MM月dd日解锁', { locale: zhCN })}
            </div>
          ) : requiredProgress > 0 ? (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">进度</span>
                <span className="font-medium">{currentProgress}/{requiredProgress}</span>
              </div>
              <Progress value={progressPercent} variant="gradient" />
            </div>
          ) : null}

          {/* Points reward */}
          {badge.pointsReward > 0 && (
            <div className="flex items-center gap-1 text-sm text-amber-500">
              <Star className="w-4 h-4" />
              {isUnlocked ? '已获得' : '解锁可获得'} {badge.pointsReward} 积分
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
