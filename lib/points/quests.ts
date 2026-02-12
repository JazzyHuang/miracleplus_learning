/**
 * 每日任务服务
 *
 * 每日 UTC+8 00:00 重置，随机分配 3 个任务。
 * 全部完成额外奖励 50 积分。
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DB, RPC } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

export interface DailyQuest {
  id: string;
  questType: string;
  targetCount: number;
  currentCount: number;
  bonusPoints: number;
  completedAt: string | null;
}

/** 任务类型定义 */
const QUEST_TYPES = [
  { type: 'complete_lesson', label: '完成 1 节课', target: 1, bonus: 50 },
  { type: 'quiz_perfect', label: '测验满分', target: 1, bonus: 30 },
  { type: 'community_comment', label: '发表 2 条评论', target: 2, bonus: 20 },
  { type: 'workshop_checkin', label: '工坊签到', target: 1, bonus: 40 },
  { type: 'rate_tool', label: '评价 AI 工具', target: 1, bonus: 10 },
  { type: 'read_article', label: '阅读 1 篇文章', target: 1, bonus: 15 },
] as const;

/** 全部完成额外奖励 */
const ALL_COMPLETE_BONUS = 50;

/** 每日任务数量 */
const DAILY_QUEST_COUNT = 3;

export const QUEST_LABELS: Record<string, string> = Object.fromEntries(
  QUEST_TYPES.map(q => [q.type, q.label])
);


export class QuestsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 获取今日任务（如果不存在则生成）
   */
  async getTodayQuests(userId: string): Promise<DailyQuest[]> {
    const today = this.getTodayDateString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from(DB.daily_quests)
      .select('id, quest_type, target_count, current_count, bonus_points, completed_at')
      .eq('user_id', userId)
      .eq('quest_date', today);

    if (error) {
      logger.error('获取每日任务失败:', error);
      return [];
    }

    // 如果今天还没有任务，生成新的
    if (!data || data.length === 0) {
      return this.generateDailyQuests(userId, today);
    }

    return data.map(this.mapQuest);
  }

  /**
   * 递增任务进度
   * 当单个任务完成后，检查是否全部完成，自动发放奖励积分
   */
  async incrementQuestProgress(userId: string, questType: string): Promise<void> {
    const today = this.getTodayDateString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: quest } = await (this.supabase as any)
      .from(DB.daily_quests)
      .select('id, current_count, target_count, completed_at')
      .eq('user_id', userId)
      .eq('quest_type', questType)
      .eq('quest_date', today)
      .maybeSingle();

    if (!quest || quest.completed_at) return;

    const newCount = quest.current_count + 1;
    const isComplete = newCount >= quest.target_count;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from(DB.daily_quests)
      .update({
        current_count: newCount,
        ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', quest.id);

    // 如果刚完成这个任务，检查是否全部完成 → 发放奖励积分
    if (isComplete) {
      const allDone = await this.checkAllComplete(userId);
      if (allDone) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (this.supabase as any).rpc(RPC.add_user_points, {
            p_user_id: userId,
            p_points: ALL_COMPLETE_BONUS,
            p_action_type: 'QUEST_ALL_COMPLETE',
            p_reference_type: 'quest',
            p_description: '每日任务全部完成奖励',
          });
        } catch (err) {
          logger.error('发放每日任务全完成奖励失败:', err);
        }
      }
    }
  }

  /**
   * 检查是否全部完成
   */
  async checkAllComplete(userId: string): Promise<boolean> {
    const quests = await this.getTodayQuests(userId);
    return quests.length > 0 && quests.every(q => q.completedAt !== null);
  }

  private async generateDailyQuests(userId: string, date: string): Promise<DailyQuest[]> {
    // 随机选择 DAILY_QUEST_COUNT 个不重复的任务类型
    const shuffled = [...QUEST_TYPES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, DAILY_QUEST_COUNT);

    const rows = selected.map(q => ({
      user_id: userId,
      quest_type: q.type,
      target_count: q.target,
      current_count: 0,
      bonus_points: q.bonus,
      quest_date: date,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from(DB.daily_quests)
      .insert(rows)
      .select('id, quest_type, target_count, current_count, bonus_points, completed_at');

    if (error) {
      logger.error('生成每日任务失败:', error);
      return [];
    }

    return (data || []).map(this.mapQuest);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapQuest(row: any): DailyQuest {
    return {
      id: row.id,
      questType: row.quest_type,
      targetCount: row.target_count,
      currentCount: row.current_count,
      bonusPoints: row.bonus_points,
      completedAt: row.completed_at,
    };
  }

  private getTodayDateString(): string {
    // UTC+8
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return utc8.toISOString().split('T')[0] ?? '';
  }
}

export const ALL_COMPLETE_BONUS_POINTS = ALL_COMPLETE_BONUS;

export function createQuestsService(supabase: SupabaseClient) {
  return new QuestsService(supabase);
}
