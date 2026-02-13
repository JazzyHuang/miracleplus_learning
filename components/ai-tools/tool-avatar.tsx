'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';

interface ToolAvatarProps {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeConfig = {
  sm: { container: 'w-10 h-10', radius: 'rounded-lg', text: 'text-sm', px: 40 },
  md: { container: 'w-12 h-12', radius: 'rounded-lg', text: 'text-base', px: 48 },
  lg: { container: 'w-24 h-24', radius: 'rounded-2xl', text: 'text-3xl', px: 96 },
} as const;

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

export function getGradientStyle(name: string) {
  const hash = hashString(name);
  const hue = hash % 360;
  const angle = (hash >> 8) % 360;
  return {
    background: `linear-gradient(${angle}deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 40) % 360}, 70%, 45%))`,
  };
}

function getFaviconUrl(websiteUrl: string): string | null {
  try {
    const domain = new URL(websiteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
}

type FallbackLevel = 'logo' | 'favicon' | 'generated';

export function ToolAvatar({ name, logoUrl, websiteUrl, size = 'sm', className }: ToolAvatarProps) {
  const faviconUrl = websiteUrl ? getFaviconUrl(websiteUrl) : null;

  const computeLevel = (): FallbackLevel => logoUrl ? 'logo' : faviconUrl ? 'favicon' : 'generated';
  const [level, setLevel] = useState<FallbackLevel>(computeLevel);

  // Sync level when props change (e.g., after admin saves logo_url)
  useEffect(() => {
    setLevel(computeLevel());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrl, websiteUrl]);

  const config = sizeConfig[size];

  const handleError = () => {
    if (level === 'logo' && faviconUrl) {
      setLevel('favicon');
    } else {
      setLevel('generated');
    }
  };

  const imageSrc = level === 'logo' ? (logoUrl ?? null) : level === 'favicon' ? (faviconUrl ?? null) : null;

  if (imageSrc) {
    return (
      <div className={cn(config.container, config.radius, 'relative shrink-0 overflow-hidden bg-muted', className)}>
        <Image
          src={imageSrc}
          alt={name}
          width={config.px}
          height={config.px}
          className="object-cover w-full h-full"
          onError={handleError}
          unoptimized
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(config.container, config.radius, 'shrink-0 flex items-center justify-center', className)}
      style={getGradientStyle(name)}
      role="img"
      aria-label={name}
    >
      <span className={cn('text-white font-bold', config.text)}>{name[0]}</span>
    </div>
  );
}
