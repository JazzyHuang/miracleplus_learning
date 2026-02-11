'use client';

import { useState, useEffect } from 'react';
import { History, Download } from 'lucide-react';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string | null;
  admin_email: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  status: 'success' | 'failure';
  error_message: string | null;
  created_at: string;
}

/**
 * 审计日志表格列定义
 */
const auditLogColumns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: 'created_at',
    header: '时间',
    cell: ({ row }) => (
      <span className="text-sm">
        {format(new Date(row.original.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
      </span>
    ),
  },
  {
    accessorKey: 'admin_name',
    header: '管理员',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.admin_name || row.original.admin_email}</div>
        <div className="text-xs text-muted-foreground">{row.original.admin_email}</div>
      </div>
    ),
  },
  {
    accessorKey: 'action_type',
    header: '操作',
    cell: ({ row }) => {
      const actionType = row.original.action_type;
      const actionLabels: Record<string, string> = {
        CREATE: '创建',
        UPDATE: '更新',
        DELETE: '删除',
        PUBLISH: '发布',
        UNPUBLISH: '取消发布',
        APPROVE: '审核通过',
        REJECT: '审核拒绝',
        EXPORT: '导出',
        ADJUST_POINTS: '调整积分',
        BULK_DELETE: '批量删除',
        BULK_PUBLISH: '批量发布',
        BULK_UPDATE: '批量更新',
        LOGIN: '登录',
      };
      return <Badge variant="outline">{actionLabels[actionType] || actionType}</Badge>;
    },
  },
  {
    accessorKey: 'resource_type',
    header: '资源类型',
    cell: ({ row }) => {
      const resourceType = row.original.resource_type;
      const resourceLabels: Record<string, string> = {
        course: '课程',
        chapter: '章节',
        lesson: '课时',
        question: '题目',
        workshop: '活动',
        user: '用户',
        article: '文章',
        reward: '商品',
        instructor_application: '讲师申请',
        discussion: '讨论',
        comment: '评论',
        experience: '工具体验',
        case: '应用案例',
        submission: '作品提交',
      };
      return <span className="text-sm">{resourceLabels[resourceType] || resourceType}</span>;
    },
  },
  {
    accessorKey: 'resource_id',
    header: '资源ID',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground font-mono">
        {row.original.resource_id || '-'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'success' ? 'default' : 'destructive'}>
        {row.original.status === 'success' ? '成功' : '失败'}
      </Badge>
    ),
  },
];

/**
 * 加载骨架屏
 */
function AuditLogsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * 管理员操作日志页面
 */
export default function AdminAuditLogsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(DB.admin_audit_logs)
        .select(`
          id,
          admin_id,
          action_type,
          resource_type,
          resource_id,
          status,
          error_message,
          created_at,
          admin:${DB.users}(email, name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(
          data.map((log: AuditLog & { admin?: { email: string; name: string | null } }) => ({
            id: log.id,
            admin_id: log.admin_id,
            admin_name: log.admin?.name,
            admin_email: log.admin?.email,
            action_type: log.action_type,
            resource_type: log.resource_type,
            resource_id: log.resource_id,
            status: log.status,
            error_message: log.error_message,
            created_at: log.created_at,
          }))
        );
      }
      setLoading(false);
    };

    fetchLogs();
  }, [supabase]);

  const handleExport = async () => {
    toast.loading('正在导出...', { id: 'export' });

    try {
      // 调用 API 路由进行导出
      const response = await fetch('/api/admin/export/audit-logs?format=csv');

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 获取文件内容
      const csv = await response.text();

      // 创建下载链接
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('导出成功', { id: 'export' });
    } catch {
      toast.error('导出失败', { id: 'export' });
    }
  };

  if (loading) {
    return <AuditLogsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            操作日志
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理员操作记录（最近 100 条）
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          导出日志
        </Button>
      </div>

      <DataTable
        columns={auditLogColumns}
        data={logs}
        searchColumn="admin_name"
        searchPlaceholder="搜索管理员..."
        pageSize={20}
      />
    </div>
  );
}
