// =============================================================
// 审计日志服务
// 统一记录所有管理员操作
// =============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { RPC } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

/**
 * 操作类型枚举
 */
export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'ADJUST_POINTS'
  | 'BULK_DELETE'
  | 'BULK_PUBLISH'
  | 'BULK_UPDATE'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'EXPORT';

/**
 * 资源类型枚举
 */
export type AuditResourceType =
  | 'course'
  | 'chapter'
  | 'lesson'
  | 'question'
  | 'workshop'
  | 'user'
  | 'article'
  | 'reward'
  | 'instructor_application'
  | 'discussion'
  | 'comment'
  | 'experience'
  | 'case'
  | 'submission'
  | 'ai_tool';

/**
 * 审计日志服务类
 */
export class AuditLogService {
  private supabase: SupabaseClient;
  private adminId: string;

  constructor(adminId: string, supabase: SupabaseClient) {
    this.supabase = supabase;
    this.adminId = adminId;
  }

  /**
   * 记录操作成功
   */
  async logSuccess(
    actionType: AuditActionType,
    resourceType: AuditResourceType,
    resourceId?: string,
    changes?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.supabase.rpc(RPC.log_admin_action, {
        p_admin_id: this.adminId,
        p_action_type: actionType,
        p_resource_type: resourceType,
        p_resource_id: resourceId || null,
        p_changes: changes || null,
        p_status: 'success',
      });
    } catch (error) {
      // 记录失败不应该影响主流程
      logger.error('Failed to log admin action:', error);
    }
  }

  /**
   * 记录操作失败
   */
  async logFailure(
    actionType: AuditActionType,
    resourceType: AuditResourceType,
    errorMessage: string,
    resourceId?: string
  ): Promise<void> {
    try {
      await this.supabase.rpc(RPC.log_admin_action, {
        p_admin_id: this.adminId,
        p_action_type: actionType,
        p_resource_type: resourceType,
        p_resource_id: resourceId || null,
        p_status: 'failure',
        p_error_message: errorMessage,
      });
    } catch (error) {
      logger.error('Failed to log admin action failure:', error);
    }
  }

  /**
   * 获取管理员 ID
   */
  getAdminId(): string {
    return this.adminId;
  }
}

/**
 * 创建审计日志服务的工厂函数
 */
export async function createAuditLogService(adminId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  return new AuditLogService(adminId, supabase);
}
