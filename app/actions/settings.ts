'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { DB } from '@/lib/db-tables';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  profileSettingsSchema,
  changePasswordSchema,
  notificationSettingsSchema,
  learningSettingsSchema,
  privacySettingsSchema,
} from '@/lib/validations';
import { type ActionResult } from '@/lib/action-result';

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('未登录');
  return { supabase, user };
}

// ==================== 个人资料 ====================

export async function updateProfileAction(data: {
  name: string;
  bio?: string;
  avatar_url?: string;
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const parsed = profileSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

    const { error } = await supabase
      .from(DB.users)
      .update({
        name: parsed.data.name.trim(),
        avatar_url: parsed.data.avatar_url || null,
        bio: parsed.data.bio || '',
      })
      .eq('id', user.id);

    if (error) {
      logger.error('更新个人资料失败', new Error(error.message));
      return { success: false, error: '保存失败，请重试' };
    }

    revalidateTag('user-stats');
    return { success: true };
  } catch (err) {
    logger.error('更新个人资料异常', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: '保存失败，请重试' };
  }
}

// ==================== 修改密码 ====================

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // 限流
    const rateResult = await checkRateLimit(
      `password-change:${user.id}`,
      RATE_LIMITS.passwordChange
    );
    if (!rateResult.success) {
      return {
        success: false,
        error: `操作过于频繁，请 ${rateResult.retryAfter} 秒后再试`,
        rateLimited: true,
        retryAfter: rateResult.retryAfter,
      };
    }

    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || '输入验证失败' };
    }

    // 验证当前密码
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email ?? '',
      password: parsed.data.currentPassword,
    });

    if (signInError) {
      return { success: false, error: '当前密码不正确' };
    }

    // 更新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      logger.error('更新密码失败', new Error(updateError.message));
      return { success: false, error: '密码修改失败，请重试' };
    }

    return { success: true };
  } catch (err) {
    logger.error('修改密码异常', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: '密码修改失败，请重试' };
  }
}

// ==================== 通知偏好 ====================

export async function updateNotificationSettingsAction(data: {
  email_course_updates: boolean;
  email_community_replies: boolean;
  email_weekly_digest: boolean;
  email_point_milestones: boolean;
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const parsed = notificationSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: '输入验证失败' };
    }

    const { error } = await supabase
      .from(DB.user_settings)
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' });

    if (error) {
      logger.error('更新通知设置失败', new Error(error.message));
      return { success: false, error: '保存失败，请重试' };
    }

    revalidateTag('user-settings');
    return { success: true };
  } catch (err) {
    logger.error('更新通知设置异常', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: '保存失败，请重试' };
  }
}

// ==================== 学习偏好 ====================

export async function updateLearningSettingsAction(data: {
  font_size: 'sm' | 'md' | 'lg';
  reduce_motion: boolean;
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const parsed = learningSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: '输入验证失败' };
    }

    const { error } = await supabase
      .from(DB.user_settings)
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' });

    if (error) {
      logger.error('更新学习偏好失败', new Error(error.message));
      return { success: false, error: '保存失败，请重试' };
    }

    revalidateTag('user-settings');
    return { success: true };
  } catch (err) {
    logger.error('更新学习偏好异常', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: '保存失败，请重试' };
  }
}

// ==================== 隐私设置 ====================

export async function updatePrivacySettingsAction(data: {
  show_on_leaderboard: boolean;
  show_profile_public: boolean;
  show_activity: boolean;
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const parsed = privacySettingsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: '输入验证失败' };
    }

    const { error } = await supabase
      .from(DB.user_settings)
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' });

    if (error) {
      logger.error('更新隐私设置失败', new Error(error.message));
      return { success: false, error: '保存失败，请重试' };
    }

    revalidateTag('user-settings');
    return { success: true };
  } catch (err) {
    logger.error('更新隐私设置异常', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: '保存失败，请重试' };
  }
}

// ==================== 数据导出 ====================

type DataExportResult = ActionResult<Record<string, unknown>>;

export async function requestDataExportAction(): Promise<DataExportResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const rateResult = await checkRateLimit(
      `data-export:${user.id}`,
      RATE_LIMITS.dataExport
    );
    if (!rateResult.success) {
      return {
        success: false,
        error: '每天最多导出一次数据',
        rateLimited: true,
        retryAfter: rateResult.retryAfter,
      };
    }

    // 并行查询所有用户数据（使用 allSettled 确保部分失败不影响整体导出）
    const results = await Promise.allSettled([
      supabase.from(DB.users).select('*').eq('id', user.id).single(),
      supabase.from(DB.user_settings).select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from(DB.user_lesson_progress).select('*').eq('user_id', user.id),
      supabase.from(DB.user_point_balance).select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from(DB.point_transactions).select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from(DB.user_streaks).select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from(DB.user_badges).select('*, badge:badges(*)').eq('user_id', user.id),
      supabase.from(DB.user_achievements).select('*, achievement:achievements(*)').eq('user_id', user.id),
      supabase.from(DB.discussions).select('*').eq('user_id', user.id),
      supabase.from(DB.comments).select('*').eq('user_id', user.id),
      supabase.from(DB.workshop_submissions).select('*').eq('user_id', user.id),
      supabase.from(DB.tool_experiences).select('*').eq('user_id', user.id),
      supabase.from(DB.course_notes).select('*').eq('user_id', user.id),
    ]);

    const extract = (r: PromiseSettledResult<{ data: unknown }> | undefined) =>
      r?.status === 'fulfilled' ? r.value.data : null;

    const [
      rProfile, rSettings, rProgress, rBalance, rTransactions,
      rStreaks, rBadges, rAchievements, rDiscussions, rComments,
      rSubmissions, rExperiences, rNotes,
    ] = results;

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: extract(rProfile),
      settings: extract(rSettings),
      learning_progress: extract(rProgress),
      points: {
        balance: extract(rBalance),
        transactions: extract(rTransactions),
      },
      streaks: extract(rStreaks),
      badges: extract(rBadges),
      achievements: extract(rAchievements),
      discussions: extract(rDiscussions),
      comments: extract(rComments),
      workshop_submissions: extract(rSubmissions),
      tool_experiences: extract(rExperiences),
      course_notes: extract(rNotes),
    };

    return { success: true, data: exportData };
  } catch (err) {
    logger.error('数据导出异常', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: '数据导出失败，请重试' };
  }
}

// ==================== 账户注销 ====================

export async function deleteAccountAction(data: {
  confirmEmail: string;
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // 限流
    const rateResult = await checkRateLimit(
      `account-deletion:${user.id}`,
      RATE_LIMITS.accountDeletion
    );
    if (!rateResult.success) {
      return {
        success: false,
        error: `操作过于频繁，请 ${Math.ceil((rateResult.retryAfter || 0) / 60)} 分钟后再试`,
        rateLimited: true,
        retryAfter: rateResult.retryAfter,
      };
    }

    // 验证邮箱匹配
    if (data.confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return { success: false, error: '邮箱地址不匹配' };
    }

    // 需要 service role key
    const serviceRoleKey = env.supabaseServiceRoleKey;
    if (!serviceRoleKey) {
      logger.error('账户注销失败：缺少 SUPABASE_SERVICE_ROLE_KEY');
      return { success: false, error: '服务配置错误，请联系管理员' };
    }

    const adminClient = createSupabaseClient(env.supabaseUrl, serviceRoleKey);

    // 删除 auth 用户（CASCADE 会自动清理所有关联数据）
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error('删除用户失败', new Error(deleteError.message));
      return { success: false, error: '账户注销失败，请重试' };
    }

    // 登出当前 session
    await supabase.auth.signOut();

    return { success: true };
  } catch (err) {
    logger.error('账户注销异常', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: '账户注销失败，请重试' };
  }
}
