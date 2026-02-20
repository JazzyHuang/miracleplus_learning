'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { createNotificationsService, type Notification } from '@/lib/notifications/service';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * 通知铃铛 + 下拉面板
 *
 * Hydration 修复：使用 mounted 守卫确保 SSR 和客户端首次渲染一致返回 null，
 * 避免因 user 状态在服务端/客户端之间的时序差异导致组件树不匹配。
 */
export function NotificationBell() {
  const { user } = useUser();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;
    const supabase = createClient();
    const service = createNotificationsService(supabase);
    service.getUnreadCount(user.id).then(setUnreadCount);
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const supabase = createClient();
    const service = createNotificationsService(supabase);
    const [list, count] = await Promise.all([
      service.list(user.id, 15),
      service.getUnreadCount(user.id),
    ]);
    setNotifications(list);
    setUnreadCount(count);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const supabase = createClient();
    const service = createNotificationsService(supabase);
    await service.markAllRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  };

  if (!mounted || !user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-foreground/50 hover:text-foreground/80 hover:bg-accent transition-all"
          aria-label={`通知${unreadCount > 0 ? ` (${unreadCount} 条未读)` : ''}`}
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">通知</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              全部已读
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">暂无通知</div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={cn(
                  'px-4 py-3 border-b border-border/50 last:border-0 transition-colors',
                  !n.readAt && 'bg-primary/5'
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: zhCN })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
