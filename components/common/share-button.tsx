'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'outline' | 'default';
  className?: string;
}

/**
 * 通用分享按钮 — navigator.share() + clipboard fallback
 */
export function ShareButton({
  title,
  text,
  url,
  size = 'sm',
  variant = 'ghost',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http')
    ? url
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 优先使用 Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: fullUrl });
        return;
      } catch {
        // 用户取消分享 — fallback 到剪贴板
      }
    }

    // Fallback: 复制链接
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('链接已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <Button
      variant={variant}
      size="icon"
      aria-label="分享"
      className={cn(sizeClasses, 'rounded-full', className)}
      onClick={handleShare}
    >
      {copied ? (
        <Check className={cn(iconSize, 'text-success')} />
      ) : (
        <Share2 className={iconSize} />
      )}
    </Button>
  );
}
