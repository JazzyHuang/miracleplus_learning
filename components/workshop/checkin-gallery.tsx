'use client';

import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ImageOff, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkshopCheckin } from '@/types/database';

interface CheckinGalleryProps {
  checkins: WorkshopCheckin[];
}

/**
 * 打卡画廊组件
 * 
 * Phase 1 修复：
 * 1. 添加图片加载状态和错误处理
 * 2. 添加图片懒加载
 * 3. 优化动画延迟（限制最大延迟为 500ms）
 * 4. 改进空状态设计
 */
export function CheckinGallery({ checkins }: CheckinGalleryProps) {
  if (checkins.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Camera className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-2">还没有打卡记录</p>
        <p className="text-sm text-muted-foreground/70">成为第一个打卡的人吧！</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {checkins.map((checkin, index) => (
        <CheckinItem 
          key={checkin.id} 
          checkin={checkin} 
          index={index} 
        />
      ))}
    </div>
  );
}

interface CheckinItemProps {
  checkin: WorkshopCheckin;
  index: number;
}

function CheckinItem({ checkin, index }: CheckinItemProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  // 限制最大动画延迟为 500ms
  const animationDelay = Math.min(index * 0.05, 0.5);

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
      className="group relative rounded-xl overflow-hidden bg-muted aspect-square"
    >
      {!imageError ? (
        <>
          {imageLoading && (
            <Skeleton className="absolute inset-0 rounded-none" aria-label="图片加载中" />
          )}
          <Image
            src={checkin.image_url}
            alt={`${checkin.user?.name || '用户'}的打卡`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`object-cover group-hover:scale-105 transition-transform duration-200 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
          <ImageOff className="w-8 h-8 mb-2" />
          <span className="text-xs">加载失败</span>
        </div>
      )}
      
      {/* Overlay with user info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border-2 border-white/30">
              <AvatarImage 
                src={checkin.user?.avatar_url || ''} 
                alt={checkin.user?.name || '用户'}
              />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {checkin.user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {checkin.user?.name || '用户'}
              </p>
              <p className="text-white/70 text-xs">
                {format(new Date(checkin.created_at), 'MM/dd HH:mm', { locale: zhCN })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
