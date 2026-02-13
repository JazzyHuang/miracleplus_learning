'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { History, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
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
import Link from 'next/link';

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
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 30;

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  UPDATE: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  PUBLISH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  UNPUBLISH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  APPROVE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  REJECT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ADJUST_POINTS: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  ROLE_CHANGE: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const actionLabels: Record<string, string> = {
  CREATE: '创建', UPDATE: '更新', DELETE: '删除',
  PUBLISH: '发布', UNPUBLISH: '取消发布',
  APPROVE: '通过', REJECT: '拒绝',
  ADJUST_POINTS: '调分', EXPORT: '导出',
  ROLE_CHANGE: '角色变更',
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
  ROLE_CHANGE: 'bg-orange-400',
};

const fieldLabels: Record<string, string> = {
  title: '标题', description: '描述', content: '内容',
  is_published: '发布状态', is_active: '上架状态', is_featured: '精选',
  cover_image: '封面图', status: '状态', name: '名称',
  pricing_type: '定价类型', type: '类型', event_date: '活动日期',
  question_text: '题目', explanation: '解析', order_index: '排序',
  feishu_url: '飞书链接', website_url: '官网链接', slug: 'Slug',
  category_id: '分类', tags: '标签', pros: '优势', cons: '不足',
  role: '角色', avatar_url: '头像', email: '邮箱',
  points: '积分', points_cost: '积分价格', category: '分类',
  published_at: '发布时间', author_id: '作者',
  course_id: '所属课程', chapter_id: '所属章节', lesson_id: '所属课时',
  options: '选项', correct_answer: '正确答案',
  rating: '评分', review_content: '评价内容',
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
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function getAdminInitial(admin: AuditEntry['admin']): string {
  if (admin?.name) return admin.name.charAt(0).toUpperCase();
  if (admin?.email) return admin.email.charAt(0).toUpperCase();
  return 'A';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExpandableValue({ value, className }: { value: unknown; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const str = formatValue(value);
  const isLong = str.length > 150;

  return (
    <span className={cn('break-all whitespace-pre-wrap', className)}>
      {isLong && !expanded ? str.slice(0, 150) + '…' : str}
      {isLong && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="ml-1 text-primary/70 hover:text-primary text-xs underline-offset-2 hover:underline"
        >
          {expanded ? '收起' : '展开'}
        </button>
      )}
    </span>
  );
}

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
    <div className="space-y-2">
      {changedKeys.map((key) => {
        const beforeVal = before?.[key];
        const afterVal = after?.[key];
        return (
          <div key={key} className="rounded-lg bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {fieldLabels[key] || key}
            </p>
            {beforeVal !== undefined && (
              <div className="flex items-start gap-2 text-xs mb-1">
                <span className="shrink-0 text-red-400/60 select-none">−</span>
                <ExpandableValue value={beforeVal} className="text-red-400/80 line-through" />
              </div>
            )}
            <div className="flex items-start gap-2 text-xs">
              <span className="shrink-0 text-emerald-400/60 select-none">+</span>
              <ExpandableValue value={afterVal} className="text-emerald-400" />
            </div>
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
    <div className="relative pl-7 pb-6 last:pb-0">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-3 bottom-0 w-px bg-border" />
      {/* Dot */}
      <div
        className={cn(
          'absolute left-0 top-[6px] w-3.5 h-3.5 rounded-full border-2 border-background',
          dotColors[entry.action_type] || 'bg-muted-foreground'
        )}
      />

      <div className="space-y-1.5">
        {/* Header row: avatar + name + badge + time */}
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-6 w-6">
            {entry.admin?.avatar_url && <AvatarImage src={entry.admin.avatar_url} alt="" />}
            <AvatarFallback className="text-xs">{getAdminInitial(entry.admin)}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">
            {entry.admin?.name || entry.admin?.email || '管理员'}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              actionColors[entry.action_type] || 'bg-muted text-muted-foreground border-border'
            )}
          >
            {actionLabels[entry.action_type] || entry.action_type}
          </span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {relativeTime(entry.created_at)}
          </span>
        </div>

        {/* Description */}
        {entry.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
        )}

        {/* Changed fields pills */}
        {entry.changed_fields && entry.changed_fields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.changed_fields.slice(0, 4).map((f) => (
              <span key={f} className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                {fieldLabels[f] || f}
              </span>
            ))}
            {entry.changed_fields.length > 4 && (
              <span className="text-xs text-muted-foreground">+{entry.changed_fields.length - 4}</span>
            )}
          </div>
        )}

        {/* Expandable diff */}
        {hasDiff && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const buildQuery = useCallback((supabase: ReturnType<typeof createClient>, cursor?: string) => {
    let query = supabase
      .from(DB.admin_audit_logs)
      .select(
        `id, admin_id, action_type, resource_type, resource_id, status, before_data, after_data, changed_fields, description, created_at, admin:${DB.users}!ml_fk_audit_logs_admin_users(name, email, avatar_url)`
      )
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (Array.isArray(resourceType)) {
      query = query.in('resource_type', resourceType);
    } else {
      query = query.eq('resource_type', resourceType);
    }
    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    return query;
  }, [resourceType, resourceId]);

  const buildFallbackQuery = useCallback((supabase: ReturnType<typeof createClient>, cursor?: string) => {
    let query = supabase
      .from(DB.admin_audit_logs)
      .select('id, admin_id, action_type, resource_type, resource_id, status, before_data, after_data, changed_fields, description, created_at')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (Array.isArray(resourceType)) {
      query = query.in('resource_type', resourceType);
    } else {
      query = query.eq('resource_type', resourceType);
    }
    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    return query;
  }, [resourceType, resourceId]);

  const processResults = useCallback((data: unknown[], append: boolean) => {
    const hasMoreItems = data.length > PAGE_SIZE;
    const items = hasMoreItems ? data.slice(0, PAGE_SIZE) : data;
    if (append) {
      setEntries((prev) => [...prev, ...(items as unknown as AuditEntry[])]);
    } else {
      setEntries(items as unknown as AuditEntry[]);
    }
    setHasMore(hasMoreItems);
  }, []);

  const fetchLogs = useCallback(async (cursor?: string, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await buildQuery(supabase, cursor);
      if (error) {
        const { data: fallbackData } = await buildFallbackQuery(supabase, cursor);
        processResults((fallbackData ?? []) as unknown[], append);
        return;
      }
      processResults((data ?? []) as unknown[], append);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [buildQuery, buildFallbackQuery, processResults]);

  useEffect(() => {
    if (open) {
      setEntries([]);
      setHasMore(false);
      void fetchLogs();
    }
  }, [open, fetchLogs, refreshKey]);

  const handleLoadMore = useCallback(() => {
    if (entries.length === 0 || loadingMore) return;
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      void fetchLogs(lastEntry.created_at, true);
    }
  }, [entries, loadingMore, fetchLogs]);

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

  // Build link to full audit logs page
  const auditPageHref = useMemo(() => {
    const params = new URLSearchParams();
    const rt = Array.isArray(resourceType) ? resourceType[0] : resourceType;
    if (rt) params.set('resource', rt);
    return `/admin/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;
  }, [resourceType]);

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

                  {/* Load more */}
                  {hasMore && !filter && (
                    <div className="pt-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="text-xs"
                      >
                        {loadingMore ? '加载中...' : '加载更多'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer: link to full audit page */}
        <div className="px-6 py-3 border-t border-border/50">
          <Link
            href={auditPageHref}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            查看全部日志
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
