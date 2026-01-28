/**
 * 邀请系统服务
 * 
 * 提供邀请新人相关的业务逻辑
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { UserInvitation } from '@/types/database';

/**
 * 邀请系统服务类
 */
export class InvitationsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 获取用户的邀请码
   * 如果不存在则创建一个
   */
  async getOrCreateInviteCode(userId: string): Promise<string | null> {
    // 先查找现有的邀请码
    const { data: existing } = await this.supabase
      .from('user_invitations')
      .select('invite_code')
      .eq('inviter_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing?.invite_code) {
      return existing.invite_code;
    }

    // 创建新的邀请码
    const { data, error } = await this.supabase.rpc('generate_invite_code', {
      p_user_id: userId,
    });

    if (error) {
      console.error('生成邀请码失败:', error);
      return null;
    }

    return data;
  }

  /**
   * 获取用户的邀请记录
   */
  async getUserInvitations(userId: string): Promise<UserInvitation[]> {
    const { data, error } = await this.supabase
      .from('user_invitations')
      .select(`
        *,
        invitee:invitee_id (id, name, email, avatar_url)
      `)
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取邀请记录失败:', error);
      return [];
    }

    return data as UserInvitation[];
  }

  /**
   * 获取邀请统计
   */
  async getInvitationStats(userId: string): Promise<{
    total: number;
    registered: number;
    completed: number;
    pointsEarned: number;
  }> {
    const { data, error } = await this.supabase
      .from('user_invitations')
      .select('status, reward_claimed')
      .eq('inviter_id', userId);

    if (error || !data) {
      return { total: 0, registered: 0, completed: 0, pointsEarned: 0 };
    }

    const total = data.length;
    const registered = data.filter((d) => d.status !== 'pending').length;
    const completed = data.filter((d) => d.status === 'completed').length;
    const pointsEarned = data.filter((d) => d.reward_claimed).length * 80;

    return { total, registered, completed, pointsEarned };
  }

  /**
   * 验证邀请码
   */
  async validateInviteCode(code: string): Promise<{
    valid: boolean;
    inviterId?: string;
    error?: string;
  }> {
    const { data, error } = await this.supabase
      .from('user_invitations')
      .select('inviter_id, status')
      .eq('invite_code', code.toUpperCase())
      .single();

    if (error || !data) {
      return { valid: false, error: '邀请码无效' };
    }

    if (data.status !== 'pending') {
      return { valid: false, error: '邀请码已被使用' };
    }

    return { valid: true, inviterId: data.inviter_id };
  }

  /**
   * 使用邀请码注册（在新用户注册后调用）
   */
  async useInviteCode(
    code: string,
    newUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    // 查找邀请记录
    const { data: invitation, error: findError } = await this.supabase
      .from('user_invitations')
      .select('id, inviter_id, status')
      .eq('invite_code', code.toUpperCase())
      .single();

    if (findError || !invitation) {
      return { success: false, error: '邀请码无效' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: '邀请码已被使用' };
    }

    // 更新邀请记录
    const { error: updateError } = await this.supabase
      .from('user_invitations')
      .update({
        invitee_id: newUserId,
        status: 'registered',
        registered_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  }

  /**
   * 完成邀请（新用户完成首次学习后调用）
   * 发放邀请奖励
   */
  async completeInvitation(
    newUserId: string
  ): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
    // 查找邀请记录
    const { data: invitation, error: findError } = await this.supabase
      .from('user_invitations')
      .select('id, inviter_id, status, reward_claimed')
      .eq('invitee_id', newUserId)
      .eq('status', 'registered')
      .single();

    if (findError || !invitation) {
      return { success: false }; // 没有邀请记录，正常情况
    }

    if (invitation.reward_claimed) {
      return { success: true, pointsAwarded: 0 }; // 已经发放过奖励
    }

    // 更新邀请状态
    const { error: updateError } = await this.supabase
      .from('user_invitations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        reward_claimed: true,
      })
      .eq('id', invitation.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 发放邀请奖励
    const { data: points } = await this.supabase.rpc('add_user_points', {
      p_user_id: invitation.inviter_id,
      p_points: 80,
      p_action_type: 'INVITE_COMPLETE',
      p_reference_id: newUserId,
      p_reference_type: 'user',
      p_description: '邀请的新用户完成首次学习',
    });

    return { success: true, pointsAwarded: points || 80 };
  }

  /**
   * 生成邀请链接
   */
  getInviteLink(code: string, baseUrl: string): string {
    return `${baseUrl}/register?invite=${code}`;
  }
}

/**
 * 创建邀请系统服务实例
 */
export function createInvitationsService(supabase: SupabaseClient): InvitationsService {
  return new InvitationsService(supabase);
}
