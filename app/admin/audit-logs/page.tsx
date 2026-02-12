'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { History, Download, RefreshCw, Search, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditAdmin {
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  status: string;
  error_message: string | null;
  description: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
  admin: AuditAdmin | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  UPDATE: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  PUBLISH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  UNPUBLISH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  APPROVE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  REJECT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ADJUST_POINTS: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  EXPORT: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const actionLabels: Record<string, string> = {
  CREATE: '创建', UPDATE: '更新', DELETE: '删除',
  PUBLISH: '发布', UNPUBLISH: '取消发布',
  APPROVE: '通过', REJECT: '拒绝',
  ADJUST_POINTS: '调分', EXPORT: '导出',
  BULK_DELETE: '批量删除', BULK_PUBLISH: '批量发布',
  BULK_UPDATE: '批量更新', LOGIN: '登录',
};

const resourceLabels: Record<string, string> = {
  course: '课程', chapter: '章节', lesson: '课时', question: '题目',
  workshop: '活动', user: '用户', article: '文章', reward: '商品',
  instructor_application: '讲师申请', discussion: '讨论', comment: '评论',
  experience: '工具体验', case: '应用案例', submission: '作品提交', ai_tool: 'AI工具',
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

const actionFilterOptions = [
  { value: '', label: '全部' },
  { value: 'CREATE', label: '创建' },
  { value: 'UPDATE', label: '更新' },
  { value: 'DELETE', label: '删除' },
  { value: 'PUBLISH', label: '发布' },
  { value: 'APPROVE', label: '审核' },
  { value: 'ADJUST_POINTS', label: '调分' },
  { value: 'EXPORT', label: '导出' },
] as const;

const resourceFilterOptions = [
  { value: '', label: '全部资源' },
  { value: 'course', label: '课程' },
  { value: 'chapter', label: '章节' },
  { value: 'lesson', label: '课时' },
  { value: 'question', label: '题目' },
  { value: 'workshop', label: '活动' },
  { value: 'ai_tool', label: 'AI工具' },
  { value: 'reward', label: '商品' },
  { value: 'article', label: '文章' },
  { value: 'user', label: '用户' },
  { value: 'instructor_application', label: '讲师申请' },
  { value: 'experience', label: '体验' },
  { value: 'case', label: '案例' },
  { value: 'submission', label: '作品' },
] as const;

const dateFilterOptions = [
  { value: '', label: '全部' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function formatAbsoluteTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '无';
  if (typeof val === 'boolean') return val ? '是' : '否';
  if (Array.isArray(val)) return val.join(', ') || '无';
  if (typeof val === 'object') {
    const s = JSON.stringify(val);
    return s.length > 120 ? s.slice(0, 120) + '...' : s;
  }
  const s = String(val);
  return s.length > 120 ? s.slice(0, 120) + '...' : s;
}

function getAdminInitial(admin: AuditAdmin | null): string {
  if (admin?.name) return admin.name.charAt(0).toUpperCase();
  if (admin?.email) return admin.email.charAt(0).toUpperCase();
  return 'A';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function DiffRow({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return <p className="text-xs text-muted-foreground">无变更数据</p>;

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
          <div key={key} className="flex items-start gap-3 text-xs">
            <span className="text-muted-foreground shrink-0 w-20 text-right font-medium">
              {fieldLabels[key] || key}
            </span>
            {beforeVal !== undefined && (
              <span className="text-red-400/80 line-through break-all max-w-[280px]">
                {formatValue(beforeVal)}
              </span>
            )}
            <span className="text-muted-foreground shrink-0">-&gt;</span>
            <span className="text-emerald-400 break-all max-w-[280px]">
              {formatValue(afterVal)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ResourceDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLabel = resourceFilterOptions.find((o) => o.value === value)?.label ?? '全部资源';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
          value
            ? 'bg-foreground text-background border-foreground'
            : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50'
        )}
      >
        {currentLabel}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover shadow-lg py-1">
          {resourceFilterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs transition-colors',
                opt.value === value
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function LogTableRow({
  log,
  hasDiff,
  isExpanded,
  onToggle,
}: {
  log: AuditLog;
  hasDiff: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={hasDiff ? onToggle : undefined}
        className={cn(
          'border-b border-border/30 transition-colors',
          hasDiff && 'cursor-pointer hover:bg-muted/40',
          !hasDiff && 'hover:bg-muted/20',
          isExpanded && 'bg-muted/30'
        )}
      >
        {/* Time */}
        <td className="px-4 py-3">
          <div className="group relative">
            <span className="text-xs text-muted-foreground">{relativeTime(log.created_at)}</span>
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50">
              <div className="px-2 py-1 text-[10px] bg-popover border border-border rounded shadow-lg whitespace-nowrap">
                {formatAbsoluteTime(log.created_at)}
              </div>
            </div>
          </div>
        </td>

        {/* Admin */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {log.admin?.avatar_url && <AvatarImage src={log.admin.avatar_url} alt="" />}
              <AvatarFallback className="text-[10px]">{getAdminInitial(log.admin)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {log.admin?.name || log.admin?.email || '管理员'}
              </p>
              {log.admin?.name && log.admin?.email && (
                <p className="text-[10px] text-muted-foreground truncate">{log.admin.email}</p>
              )}
            </div>
          </div>
        </td>

        {/* Action */}
        <td className="px-4 py-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              actionColors[log.action_type] || 'bg-muted text-muted-foreground border-border'
            )}
          >
            {actionLabels[log.action_type] || log.action_type}
          </span>
        </td>

        {/* Resource type */}
        <td className="px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {resourceLabels[log.resource_type] || log.resource_type}
          </span>
        </td>

        {/* Description */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-xs text-foreground/80 truncate max-w-[400px]">
              {log.description || (log.resource_id ? `资源 ${log.resource_id.slice(0, 8)}...` : '-')}
            </p>
            {hasDiff && (
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border',
              log.status === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30'
            )}
          >
            {log.status === 'success' ? '成功' : '失败'}
          </span>
        </td>
      </tr>

      {/* Expanded diff row */}
      {isExpanded && hasDiff && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-muted/20 border-b border-border/30">
            <div className="pl-4 border-l-2 border-border/50">
              <p className="text-[11px] font-medium text-muted-foreground mb-2">变更详情</p>
              <DiffRow before={log.before_data} after={log.after_data} />
              {log.error_message && (
                <p className="mt-2 text-xs text-red-400">
                  错误: {log.error_message}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination
  const [hasMore, setHasMore] = useState(false);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalHint, setTotalHint] = useState<number | null>(null);

  const hasActiveFilters = actionFilter || resourceFilter || dateFilter || searchQuery;

  const fetchLogs = useCallback(async (cursor?: string) => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from(DB.admin_audit_logs)
      .select(
        `id, admin_id, action_type, resource_type, resource_id, status, error_message, description, before_data, after_data, changed_fields, created_at, admin:${DB.users}!ml_fk_audit_logs_admin_users(email, name, avatar_url)`,
        { count: 'estimated' }
      )
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (actionFilter) query = query.eq('action_type', actionFilter);
    if (resourceFilter) query = query.eq('resource_type', resourceFilter);
    if (dateFilter === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query = query.gte('created_at', todayStart.toISOString());
    } else if (dateFilter === '7d') {
      query = query.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
    } else if (dateFilter === '30d') {
      query = query.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    }
    if (searchQuery) {
      query = query.or(`description.ilike.%${searchQuery}%,resource_id.ilike.%${searchQuery}%`);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error, count } = await query;

    if (error) {
      // Fallback: retry without admin join (FK may not exist yet)
      let fallbackQuery = supabase
        .from(DB.admin_audit_logs)
        .select(
          'id, admin_id, action_type, resource_type, resource_id, status, error_message, description, before_data, after_data, changed_fields, created_at',
          { count: 'estimated' }
        )
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (actionFilter) fallbackQuery = fallbackQuery.eq('action_type', actionFilter);
      if (resourceFilter) fallbackQuery = fallbackQuery.eq('resource_type', resourceFilter);
      if (dateFilter === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        fallbackQuery = fallbackQuery.gte('created_at', todayStart.toISOString());
      } else if (dateFilter === '7d') {
        fallbackQuery = fallbackQuery.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
      } else if (dateFilter === '30d') {
        fallbackQuery = fallbackQuery.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
      }
      if (searchQuery) {
        fallbackQuery = fallbackQuery.or(`description.ilike.%${searchQuery}%,resource_id.ilike.%${searchQuery}%`);
      }
      if (cursor) {
        fallbackQuery = fallbackQuery.lt('created_at', cursor);
      }

      const { data: fbData, error: fbError, count: fbCount } = await fallbackQuery;
      if (fbError) {
        toast.error('加载日志失败');
        setLoading(false);
        return;
      }
      if (fbData) {
        const hasMoreItems = fbData.length > PAGE_SIZE;
        const items = hasMoreItems ? fbData.slice(0, PAGE_SIZE) : fbData;
        setLogs(items as unknown as AuditLog[]);
        setHasMore(hasMoreItems);
        if (items.length > 0) {
          const lastItem = items[items.length - 1];
          setNextCursor((lastItem as unknown as AuditLog).created_at);
        } else {
          setNextCursor(null);
        }
        if (fbCount !== null && fbCount !== undefined && !cursor) {
          setTotalHint(fbCount);
        }
      }
      setLoading(false);
      return;
    }

    if (data) {
      const hasMoreItems = data.length > PAGE_SIZE;
      const items = hasMoreItems ? data.slice(0, PAGE_SIZE) : data;
      setLogs(items as unknown as AuditLog[]);
      setHasMore(hasMoreItems);
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        setNextCursor((lastItem as unknown as AuditLog).created_at);
      } else {
        setNextCursor(null);
      }
      if (count !== null && count !== undefined && !cursor) {
        setTotalHint(count);
      }
    }
    setLoading(false);
  }, [actionFilter, resourceFilter, dateFilter, searchQuery]);

  // Initial load + filter changes
  useEffect(() => {
    setCursorStack([]);
    setNextCursor(null);
    setExpandedId(null);
    void fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value.trim());
    }, 400);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCursorStack([]);
    setNextCursor(null);
    setExpandedId(null);
    await fetchLogs();
    setRefreshing(false);
  }, [fetchLogs]);

  const handleNextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, logs[0]?.created_at ?? '']);
    setExpandedId(null);
    void fetchLogs(nextCursor);
  }, [nextCursor, logs, fetchLogs]);

  const handlePrevPage = useCallback(() => {
    if (cursorStack.length === 0) return;
    const newStack = [...cursorStack];
    newStack.pop();
    setCursorStack(newStack);
    setExpandedId(null);
    // Go back to first page if stack is empty, otherwise use the previous cursor
    if (newStack.length === 0) {
      void fetchLogs();
    } else {
      const prevCursor = newStack[newStack.length - 1];
      void fetchLogs(prevCursor);
    }
  }, [cursorStack, fetchLogs]);

  const handleClearFilters = useCallback(() => {
    setActionFilter('');
    setResourceFilter('');
    setDateFilter('');
    setSearchQuery('');
    setSearchInput('');
  }, []);

  const handleExport = async () => {
    toast.loading('正在导出...', { id: 'export' });
    try {
      const response = await fetch('/api/admin/export/audit-logs?format=csv');
      if (!response.ok) throw new Error('导出失败');
      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('导出成功', { id: 'export' });
    } catch {
      toast.error('导出失败', { id: 'export' });
    }
  };

  const pageNumber = cursorStack.length + 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            操作日志
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理员操作审计记录
            {totalHint !== null && !hasActiveFilters && (
              <span className="ml-1">（共 {totalHint.toLocaleString()} 条）</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            导出
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
        {/* Row 1: Action pills + Resource dropdown */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Action type pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {actionFilterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActionFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                  actionFilter === opt.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border/50 hidden sm:block" />

          {/* Resource type dropdown */}
          <ResourceDropdown value={resourceFilter} onChange={setResourceFilter} />
        </div>

        {/* Row 2: Date range + Search + Clear */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range pills */}
          <div className="flex items-center gap-1.5">
            {dateFilterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDateFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                  dateFilter === opt.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border/50 hidden sm:block" />

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="搜索描述或资源ID..."
              className="h-8 pl-8 pr-8 text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <History className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">暂无日志记录</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-2 text-xs text-primary hover:underline"
              >
                清除筛选条件
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[140px]">时间</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[160px]">管理员</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[90px]">操作</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[90px]">资源类型</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">描述</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-[70px]">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const hasDiff = log.before_data || log.after_data;
                    const isExpanded = expandedId === log.id;

                    return (
                      <LogTableRow
                        key={log.id}
                        log={log}
                        hasDiff={!!hasDiff}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : log.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                第 {pageNumber} 页
                {logs.length > 0 && ` (${logs.length} 条)`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={cursorStack.length === 0}
                  className="h-7 text-xs"
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className="h-7 text-xs"
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
