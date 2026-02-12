'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { History, ChevronDown, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { cn } from '@/lib/utils';
import type { AuditResourceType } from '@/lib/admin/audit-service';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: string;
  admin_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  status: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  description: string | null;
  created_at: string;
  admin: { name: string | null; email: string | null; avatar_url: string | null } | null;
}

interface ResourceAuditLogProps {
  resourceType: AuditResourceType | AuditResourceType[];
  resourceId?: string;
  trigger?: React.ReactNode;
  /** Increment this value to trigger a refresh (e.g. after an admin action) */
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  UPDATE: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  PUBLISH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  UNPUBLISH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  APPROVE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  REJECT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ADJUST_POINTS: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

const actionLabels: Record<string, string> = {
  CREATE: '创建', UPDATE: '更新', DELETE: '删除',
  PUBLISH: '发布', UNPUBLISH: '取消发布',
  APPROVE: '通过', REJECT: '拒绝',
  ADJUST_POINTS: '调分', EXPORT: '导出',
};

const dotColors: Record<string, string> = {
  CREATE: 'bg-emerald-400',
  UPDATE: 'bg-blue-400',
  DELETE: 'bg-red-400',
  PUBLISH: 'bg-violet-400',
  UNPUBLISH: 'bg-violet-400',
  APPROVE: 'bg-amber-400',
  REJECT: 'bg-amber-400',
  ADJUST_POINTS: 'bg-cyan-400',
};

const fieldLabels: Record<string, string> = {
  title: '标题', description: '描述', content: '内容',
  is_published: '发布状态', is_active: '上架状态', is_featured: '精选',
  cover_image: '封面图', status: '状态', name: '名称',
  pricing_type: '定价类型', type: '类型', event_date: '活动日期',
  question_text: '题目', explanation: '解析', order_index: '排序',
  feishu_url: '飞书链接', website_url: '官网', slug: 'Slug',
  category_id: '分类', tags: '标签', pros: '优势', cons: '不足',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return '刚刚';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}个月前`;
  return `${Math.floor(diffMonth / 12)}年前`;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '无';
  if (typeof val === 'boolean') return val ? '是' : '否';
  if (Array.isArray(val)) return val.join(', ') || '无';
  if (typeof val === 'object') {
    const s = JSON.stringify(val);
    return s.length > 100 ? s.slice(0, 100) + '…' : s;
  }
  const s = String(val);
  return s.length > 100 ? s.slice(0, 100) + '…' : s;
}

function getAdminInitial(admin: AuditEntry['admin']): string {
  if (admin?.name) return admin.name.charAt(0).toUpperCase();
  if (admin?.email) return admin.email.charAt(0).toUpperCase();
  return 'A';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DiffViewer({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return null;
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const changedKeys = Array.from(allKeys).filter((key) => {
    const bv = before?.[key];
    const av = after?.[key];
    return JSON.stringify(bv) !== JSON.stringify(av);
  });
  if (changedKeys.length === 0) return <p className="text-xs text-muted-foreground">无字段变更</p>;

  return (
    <div className="space-y-1.5">
      {changedKeys.map((key) => {
        const beforeVal = before?.[key];
        const afterVal = after?.[key];
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground shrink-0 w-16">{fieldLabels[key] || key}</span>
            <span className="text-red-400 line-through break-all">{formatValue(beforeVal)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-emerald-400 break-all">{formatValue(afterVal)}</span>
          </div>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 py-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <History className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">暂无操作记录</p>
    </div>
  );
}

function TimelineItem({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = entry.before_data || entry.after_data;

  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-3 bottom-0 w-px bg-border" />
      {/* Dot */}
      <div
        className={cn(
          'absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full border-2 border-background',
          dotColors[entry.action_type] || 'bg-muted-foreground'
        )}
      />

      <div className="space-y-1.5">
        {/* Header row: avatar + name + badge + time */}
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5">
            {entry.admin?.avatar_url && <AvatarImage src={entry.admin.avatar_url} alt="" />}
            <AvatarFallback className="text-[10px]">{getAdminInitial(entry.admin)}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">
            {entry.admin?.name || entry.admin?.email || '管理员'}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
              actionColors[entry.action_type] || 'bg-muted text-muted-foreground border-border'
            )}
          >
            {actionLabels[entry.action_type] || entry.action_type}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
            {relativeTime(entry.created_at)}
          </span>
        </div>

        {/* Description */}
        {entry.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
        )}

        {/* Expandable diff */}
        {hasDiff && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              变更详情
            </button>
            {expanded && (
              <div className="mt-2 p-2.5 rounded-md bg-muted/50 border border-border/50">
                <DiffViewer before={entry.before_data} after={entry.after_data} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ResourceAuditLog({ resourceType, resourceId, trigger, refreshKey }: ResourceAuditLogProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from(DB.admin_audit_logs)
        .select(
          `id, admin_id, action_type, resource_type, resource_id, status, before_data, after_data, changed_fields, description, created_at, admin:${DB.users}!ml_fk_audit_logs_admin_users(name, email, avatar_url)`
        )
        .order('created_at', { ascending: false })
        .limit(30);

      if (Array.isArray(resourceType)) {
        query = query.in('resource_type', resourceType);
      } else {
        query = query.eq('resource_type', resourceType);
      }
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback: query without admin join if FK not yet applied
        let fallbackQuery = supabase
          .from(DB.admin_audit_logs)
          .select('id, admin_id, action_type, resource_type, resource_id, status, before_data, after_data, changed_fields, description, created_at')
          .order('created_at', { ascending: false })
          .limit(30);

        if (Array.isArray(resourceType)) {
          fallbackQuery = fallbackQuery.in('resource_type', resourceType);
        } else {
          fallbackQuery = fallbackQuery.eq('resource_type', resourceType);
        }
        if (resourceId) {
          fallbackQuery = fallbackQuery.eq('resource_id', resourceId);
        }

        const { data: fallbackData } = await fallbackQuery;
        setEntries((fallbackData as unknown as AuditEntry[]) ?? []);
        return;
      }
      setEntries((data as unknown as AuditEntry[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    if (open) {
      void fetchLogs();
    }
  }, [open, fetchLogs, refreshKey]);

  // Derive available action types for filter pills
  const availableTypes = useMemo(() => {
    const types = new Set(entries.map((e) => e.action_type));
    return Array.from(types).sort();
  }, [entries]);

  const filteredEntries = useMemo(
    () => (filter ? entries.filter((e) => e.action_type === filter) : entries),
    [entries, filter]
  );

  const showFilters = availableTypes.length > 1;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-1.5" />
            操作记录
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <SheetTitle>操作记录</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-4">
              {/* Filter pills */}
              {!loading && showFilters && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    type="button"
                    onClick={() => setFilter(null)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      !filter ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    全部
                  </button>
                  {availableTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilter(type)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        filter === type ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {actionLabels[type] || type}
                    </button>
                  ))}
                </div>
              )}

              {/* Content */}
              {loading ? (
                <LoadingSkeleton />
              ) : filteredEntries.length === 0 ? (
                <EmptyState />
              ) : (
                <div>
                  {filteredEntries.map((entry) => (
                    <TimelineItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
