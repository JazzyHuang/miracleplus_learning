'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { WorkshopCheckin } from '@/types/database';

interface CheckinGalleryProps {
  checkins: WorkshopCheckin[];
}

export function CheckinGallery({ checkins }: CheckinGalleryProps) {
  if (checkins.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">还没有打卡记录，成为第一个打卡的人吧！</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {checkins.map((checkin, index) => (
        <motion.div
          key={checkin.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="group relative rounded-xl overflow-hidden bg-muted aspect-square"
        >
          <Image
            src={checkin.image_url}
            alt="Checkin"
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Overlay with user info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border-2 border-white/30">
                  <AvatarImage src={checkin.user?.avatar_url || ''} />
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
        </motion.div>
      ))}
    </div>
  );
}
