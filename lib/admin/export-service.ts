// =============================================================
// 数据导出服务
// 支持 CSV 和 JSON 格式导出
// =============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { DB } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

/**
 * CSV 导出辅助函数
 */
function arrayToCsv(data: string[][]): string {
  return data.map(row =>
    row.map(cell => {
      // 转义包含逗号、引号或换行的单元格
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

/**
 * 导出选项
 */
export interface ExportOptions {
  format?: 'csv' | 'json';
  limit?: number;
}

/**
 * 数据导出服务类
 */
export class ExportService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * 导出用户数据
   */
  async exportUsers(options: ExportOptions = {}): Promise<string> {
    const { format = 'csv', limit = 10000 } = options;

    try {
      const { data, error } = await this.supabase
        .from(DB.users)
        .select('id, email, name, role, total_points, level, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(`导出失败: ${error.message}`);
      if (!data || data.length === 0) return format === 'csv' ? '' : '[]';

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      }

      // CSV 格式
      const headers = ['ID', '邮箱', '姓名', '角色', '积分', '等级', '注册时间'];
      const levelNames: Record<number, string> = { 1: 'AI 观察员', 2: 'AI 实践家', 3: 'AI 领航员' };
      const rows = data.map((u: { id: string; email: string; name: string | null; role: string | null; total_points: number | null; level: number | null; created_at: string }) => [
        u.id,
        u.email,
        u.name || '',
        u.role || 'user',
        String(u.total_points || 0),
        levelNames[u.level || 1] || 'AI 观察员',
        new Date(u.created_at).toLocaleString('zh-CN'),
      ]);

      return arrayToCsv([headers, ...rows]);
    } catch (error) {
      logger.error('Export users failed:', error);
      throw error;
    }
  }

  /**
   * 导出课程数据
   */
  async exportCourses(options: ExportOptions = {}): Promise<string> {
    const { format = 'csv', limit = 1000 } = options;

    try {
      const { data, error } = await this.supabase
        .from(DB.courses)
        .select('id, title, description, is_published, order_index, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(`导出失败: ${error.message}`);
      if (!data || data.length === 0) return format === 'csv' ? '' : '[]';

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      }

      const headers = ['ID', '标题', '简介', '发布状态', '排序', '创建时间', '更新时间'];
      const rows = data.map((c: { id: string; title: string; description: string | null; is_published: boolean; order_index: number; created_at: string; updated_at: string | null }) => [
        c.id,
        c.title,
        c.description || '',
        c.is_published ? '已发布' : '草稿',
        String(c.order_index),
        new Date(c.created_at).toLocaleString('zh-CN'),
        c.updated_at ? new Date(c.updated_at).toLocaleString('zh-CN') : '',
      ]);

      return arrayToCsv([headers, ...rows]);
    } catch (error) {
      logger.error('Export courses failed:', error);
      throw error;
    }
  }

  /**
   * 导出积分流水
   */
  async exportPointTransactions(options: ExportOptions = {}): Promise<string> {
    const { format = 'csv', limit = 5000 } = options;

    try {
      const { data, error } = await this.supabase
        .from(DB.point_transactions)
        .select(`
          id,
          points,
          action_type,
          description,
          created_at,
          user_id,
          user:${DB.users}(email, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(`导出失败: ${error.message}`);

      type TransactionRow = {
        id: string;
        points: number;
        action_type: string;
        description: string | null;
        created_at: string;
        user_id: string;
        user: { email: string; name: string | null } | null;
      };

      const transactions = (data || []) as unknown as TransactionRow[];

      if (format === 'json') {
        return JSON.stringify(transactions, null, 2);
      }

      const headers = ['ID', '用户', '邮箱', '积分变动', '操作类型', '描述', '时间'];
      const rows = transactions.map(t => [
        t.id,
        t.user?.name || '',
        t.user?.email || '',
        t.points > 0 ? `+${t.points}` : String(t.points),
        t.action_type,
        t.description || '',
        new Date(t.created_at).toLocaleString('zh-CN'),
      ]);

      return arrayToCsv([headers, ...rows]);
    } catch (error) {
      logger.error('Export point transactions failed:', error);
      throw error;
    }
  }

  /**
   * 导出审计日志
   */
  async exportAuditLogs(options: ExportOptions = {}): Promise<string> {
    const { format = 'csv', limit = 10000 } = options;

    try {
      const { data, error } = await this.supabase
        .from(DB.admin_audit_logs)
        .select(`
          id,
          action_type,
          resource_type,
          resource_id,
          status,
          error_message,
          created_at,
          admin_id,
          admin:${DB.users}(email, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(`导出失败: ${error.message}`);

      type LogRow = {
        id: string;
        action_type: string;
        resource_type: string;
        resource_id: string | null;
        status: string;
        error_message: string | null;
        created_at: string;
        admin_id: string;
        admin: { email: string; name: string | null } | null;
      };

      const logs = (data || []) as unknown as LogRow[];

      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      }

      const headers = ['时间', '管理员', '操作', '资源类型', '资源ID', '状态', '错误信息'];
      const rows = logs.map(log => [
        new Date(log.created_at).toLocaleString('zh-CN'),
        log.admin?.name || log.admin?.email || log.admin_id,
        log.action_type,
        log.resource_type,
        log.resource_id || '',
        log.status === 'success' ? '成功' : '失败',
        log.error_message || '',
      ]);

      return arrayToCsv([headers, ...rows]);
    } catch (error) {
      logger.error('Export audit logs failed:', error);
      throw error;
    }
  }
}

// 工厂函数已移除 — 请使用 API 路由 /api/admin/export/* 进行导出
// 这样可以避免客户端组件导入服务器端模块的问题
