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
 * logSuccess 的扩展选项
 */
interface AuditLogOptions {
  /** 向后兼容：旧的 changes 字段 */
  changes?: Record<string, unknown>;
  /** 操作前的数据快照 */
  beforeData?: Record<string, unknown>;
  /** 操作后的数据快照 */
  afterData?: Record<string, unknown>;
  /** 变更的字段名列表（不传则自动计算） */
  changedFields?: string[];
  /** 操作描述（中文） */
  description?: string;
}

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
   * 自动计算 before/after 之间变更的字段名
   */
  static computeChangedFields(
    before: Record<string, unknown> | null | undefined,
    after: Record<string, unknown> | null | undefined
  ): string[] {
    if (!before || !after) return [];
    const fields: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        fields.push(key);
      }
    }
    return fields;
  }

  /**
   * 记录操作成功
   * 支持两种调用方式（向后兼容）：
   *   logSuccess(type, resource, id, { after: data })          // 旧方式
   *   logSuccess(type, resource, id, { beforeData, afterData }) // 新方式
   */
  async logSuccess(
    actionType: AuditActionType,
    resourceType: AuditResourceType,
    resourceId?: string,
    options?: AuditLogOptions | Record<string, unknown>
  ): Promise<void> {
    try {
      // 判断是新格式还是旧格式
      const opts = options as AuditLogOptions | undefined;
      const hasNewFields = opts && ('beforeData' in opts || 'afterData' in opts || 'description' in opts);

      const beforeData = hasNewFields ? (opts?.beforeData ?? null) : null;
      const afterData = hasNewFields ? (opts?.afterData ?? null) : null;
      const changedFields = hasNewFields
        ? (opts?.changedFields ?? AuditLogService.computeChangedFields(beforeData, afterData))
        : null;
      const description = hasNewFields ? (opts?.description ?? null) : null;

      await this.supabase.rpc(RPC.log_admin_action, {
        p_admin_id: this.adminId,
        p_action_type: actionType,
        p_resource_type: resourceType,
        p_resource_id: resourceId || null,
        p_changes: options || null,
        p_status: 'success',
        p_error_message: null,
        p_before_data: beforeData,
        p_after_data: afterData,
        p_changed_fields: changedFields && changedFields.length > 0 ? changedFields : null,
        p_description: description,
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
        p_before_data: null,
        p_after_data: null,
        p_changed_fields: null,
        p_description: null,
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
