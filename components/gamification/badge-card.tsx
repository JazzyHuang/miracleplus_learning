'use client';

import Image from 'next/image';
import { Lock, Award } from 'lucide-react';
import { getBadgeImage, getBadgeBaseName, getBadgeTierRingStyle } from '@/lib/points/badge-assets';
import { BADGE_ICON_MAP } from './badge-icons';
import type { BadgeProgress } from '@/lib/points/badges';
import { cn } from '@/lib/utils';

interface BadgeCardProps {
  badgeProgress: BadgeProgress;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

const PROGRESS_RING_R = 30;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_R;

/**
 * 可复用徽章卡片
 * - 已解锁：彩色图片 + 等级光环
 * - 未解锁：灰度图片 + SVG 进度环
 * - 差一点（>=80%）：脉冲动画高亮
 */
export function BadgeCard({ badgeProgress, onClick, size = 'md' }: BadgeCardProps) {
  const { badge, isUnlocked, progressPercent, isNearMiss, currentProgress, requiredProgress } = badgeProgress;
  const imageSrc = getBadgeImage(badge.code, size === 'sm' ? 64 : 128);
  const tierRing = getBadgeTierRingStyle(badge.tier);
  const dimension = size === 'sm' ? 56 : 72;
  const svgSize = dimension + 12; // extra space for ring

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-xl transition-all cursor-pointer',
        'hover:scale-105 active:scale-95',
        isUnlocked
          ? 'bg-primary/5 border border-primary/20'
          : isNearMiss
            ? 'bg-amber-500/5 border border-amber-500/20 animate-pulse-subtle'
            : 'bg-muted/30 border border-border/30',
      )}
    >
      {/* Badge image with progress ring or tier ring */}
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        {/* SVG progress ring for locked badges */}
        {!isUnlocked && requiredProgress > 0 && (
          <svg
            className="absolute inset-0"
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background track */}
            <circle
              cx={svgSize / 2}
              cy={svgSize / 2}
              r={PROGRESS_RING_R}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted/30"
            />
            {/* Progress arc */}
            {progressPercent > 0 && (
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={PROGRESS_RING_R}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={isNearMiss ? 'text-amber-500' : 'text-primary'}
                strokeDasharray={PROGRESS_RING_CIRCUMFERENCE}
                strokeDashoffset={PROGRESS_RING_CIRCUMFERENCE * (1 - progressPercent / 100)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            )}
          </svg>
        )}

        {/* Badge image centered */}
        <div
          className={cn(
            'absolute rounded-full flex items-center justify-center overflow-hidden',
            isUnlocked && `ring ${tierRing.ringWidth} ${tierRing.ringColor} ${tierRing.glowShadow}`,
            !isUnlocked && progressPercent === 0 && 'opacity-50',
          )}
          style={{
            width: dimension,
            height: dimension,
            top: (svgSize - dimension) / 2,
            left: (svgSize - dimension) / 2,
          }}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={badge.name}
              width={dimension}
              height={dimension}
              className={cn(!isUnlocked && 'grayscale opacity-60')}
            />
          ) : (() => {
            const baseName = getBadgeBaseName(badge.code);
            const SvgIcon = baseName ? BADGE_ICON_MAP[baseName] : null;
            return (
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
                {SvgIcon ? (
                  <SvgIcon
                    size={isUnlocked ? dimension * 0.45 : dimension * 0.35}
                    className={isUnlocked ? 'text-white' : 'text-muted-foreground'}
                  />
                ) : isUnlocked ? (
                  <Award className="w-7 h-7 text-white" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Badge name */}
      <span className={cn(
        'text-xs text-center truncate w-full',
        isUnlocked ? 'text-card-foreground' : 'text-muted-foreground',
      )}>
        {badge.name}
      </span>

      {/* Progress text for locked badges */}
      {!isUnlocked && requiredProgress > 0 && (
        <span className={cn(
          'text-[10px]',
          isNearMiss ? 'text-amber-500 font-medium' : 'text-muted-foreground',
        )}>
          {currentProgress}/{requiredProgress}
        </span>
      )}
    </button>
  );
}
