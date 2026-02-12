/**
 * 通知服务
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DB } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

export type NotificationType =
  | 'badge_unlock'
  | 'level_up'
  | 'quest_complete'
  | 'streak_reminder'
  | 'comment_reply'
  | 'answer_accepted';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export class NotificationsService {
  constructor(private supabase: SupabaseClient) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any)
      .from(DB.notifications)
      .insert({ user_id: userId, type, title, body: body || null, data: data || {} });

    if (error) logger.error('创建通知失败:', error);
  }

  async list(userId: string, limit = 20): Promise<Notification[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from(DB.notifications)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('获取通知列表失败:', error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data || {},
      readAt: n.read_at,
      createdAt: n.created_at,
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (this.supabase as any)
      .from(DB.notifications)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      logger.error('获取未读通知数失败:', error);
      return 0;
    }
    return count || 0;
  }

  async markRead(notificationId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from(DB.notifications)
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
  }

  async markAllRead(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from(DB.notifications)
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
  }
}

export function createNotificationsService(supabase: SupabaseClient) {
  return new NotificationsService(supabase);
}
