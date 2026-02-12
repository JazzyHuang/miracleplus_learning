'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, Flame, BookOpen, Calendar, Activity, Trophy } from 'lucide-react';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { createClient } from '@/lib/supabase/client';
import { createAnalyticsService } from '@/lib/analytics';
import { DB } from '@/lib/db-tables';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BRAND_COLORS } from '@/lib/brand-colors';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from '@/components/charts';
import type { UserDetail } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<number, string> = {
  0: '观察者', 1: '学习者', 2: '实践者', 3: 'AI领航员',
};

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  1: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  2: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  3: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const ACTION_LABELS: Record<string, string> = {
  LESSON_MARK_COMPLETE: '完成课时', COURSE_REVIEW: '课程评价',
  COURSE_QUESTION: '课程提问', COURSE_ANSWER: '回答问题',
  COURSE_50_PERCENT: '完成50%', COURSE_100_PERCENT: '完成100%',
  QUIZ_PERFECT: '测验满分', DAILY_LOGIN: '每日登录',
  DAILY_REVIEW: '每日复习', WORKSHOP_CHECKIN: '活动签到',
  WORKSHOP_SUBMISSION: '提交作品', DISCUSSION_POST: '发帖',
  COMMENT: '评论', CREATE_DISCUSSION: '创建讨论',
  TOOL_EXPERIENCE: '工具体验', TOOL_RATING: '工具评分',
  ARTICLE_READ: '阅读文章', INVITE_USER: '邀请用户',
  WEEKLY_STREAK: '周连续', MONTHLY_STREAK: '月连续',
  NOTE_UPLOAD: '上传笔记', COURSE_NOTE: '课程笔记',
};
function getActionBadgeColor(actionType: string): string {
  if (/^(LESSON|COURSE|QUIZ|DAILY_REVIEW|NOTE|EASTER_EGG)/.test(actionType)) {
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  }
  if (/^WORKSHOP/.test(actionType)) {
    return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
  }
  if (/^(DISCUSSION|COMMENT|ARTICLE|TOPIC|CREATE_DISCUSSION)/.test(actionType)) {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
  if (/^TOOL/.test(actionType)) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
  return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
}

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

// ---------------------------------------------------------------------------
// Search result type
// ---------------------------------------------------------------------------

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserProfileTab() {
  const [searchInput, setSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const supabase = createClient();
  const service = createAnalyticsService(supabase);

  // Debounced search — derive empty state from searchInput directly
  const trimmedInput = searchInput.trim();

  useEffect(() => {
    if (!trimmedInput) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const client = createClient();
      const { data } = await client
        .from(DB.users)
        .select('id, name, email, avatar_url')
        .or(`name.ilike.%${trimmedInput}%,email.ilike.%${trimmedInput}%`)
        .neq('role', 'admin')
        .limit(5);
      if (!controller.signal.aborted) {
        const results = (data ?? []) as SearchUser[];
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      }
    }, 300);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [trimmedInput]);

  // Clear results when input is empty (derived, not in effect)
  const effectiveResults = trimmedInput ? searchResults : [];
  const effectiveDropdown = trimmedInput ? showDropdown : false;

  // Fetch user detail when selected
  const { data: detail, loading } = useCachedQuery<UserDetail | null>(
    selectedUserId ? 'analytics-user-' + selectedUserId : 'analytics-user-none',
    selectedUserId ? () => service.getUserDetail(selectedUserId) : () => Promise.resolve(null),
    { ttl: 60000, enabled: !!selectedUserId },
  );

  // Radar chart data
  const radarData = useMemo(() => {
    if (!detail) return [];
    return [
      { dimension: '学习', value: Math.min((detail.learning.lessons_completed / 50) * 100, 100) },
      { dimension: '社区', value: Math.min((detail.community.discussions + detail.community.comments) / 30 * 100, 100) },
      { dimension: '测验', value: detail.learning.avg_quiz_score },
      { dimension: '参与度', value: detail.engagement?.score ?? 0 },
      { dimension: '连续性', value: Math.min((detail.streak?.current ?? 0) / 30 * 100, 100) },
    ];
  }, [detail]);

  // Activity calendar: last 30 days
  const activityDays = useMemo(() => {
    if (!detail) return new Set<string>();
    return new Set(
      detail.recent_actions.map((a) =>
        new Date(a.created_at).toISOString().slice(0, 10)
      )
    );
  }, [detail]);

  const last30Days = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  }, []);

  function handleSelectUser(user: SearchUser) {
    setSelectedUserId(user.id);
    setSearchInput(user.name || user.email);
    setShowDropdown(false);
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索用户（姓名或邮箱）"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            if (selectedUserId) setSelectedUserId(null);
          }}
          className="pl-9 pr-9"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSelectedUserId(null); setSearchResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {/* Dropdown */}
        {effectiveDropdown && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border/50 bg-card shadow-lg overflow-hidden">
            {effectiveResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-7 h-7">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
                  <AvatarFallback className="text-xs">{(user.name || '?')[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* No user selected */}
      {!selectedUserId && (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          请搜索并选择一个用户
        </div>
      )}

      {/* Loading */}
      {selectedUserId && loading && <UserDetailSkeleton />}

      {/* User detail */}
      {selectedUserId && !loading && detail && (
        <>
          {/* Row 1: User info card */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Left: avatar + info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Avatar className="w-14 h-14">
                  {detail.user.avatar_url && (
                    <AvatarImage src={detail.user.avatar_url} alt={detail.user.name} />
                  )}
                  <AvatarFallback className="text-lg">
                    {(detail.user.name || '?')[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg truncate">{detail.user.name}</h3>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                      LEVEL_COLORS[detail.user.level] ?? LEVEL_COLORS[0],
                    )}>
                      {LEVEL_LABELS[detail.user.level] ?? `Lv${detail.user.level}`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{detail.user.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Trophy className="inline w-3 h-3 mr-1" />
                    {detail.user.total_points.toLocaleString('zh-CN')} 积分
                  </p>
                </div>
              </div>

              {/* Right: mini stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat
                  icon={Activity}
                  label="参与度"
                  value={detail.engagement?.score ?? 0}
                  suffix="/100"
                />
                <MiniStat
                  icon={Calendar}
                  label="活跃天数"
                  value={detail.engagement?.active_days_30d ?? 0}
                  suffix="天"
                />
                <MiniStat
                  icon={BookOpen}
                  label="完成课时"
                  value={detail.learning.lessons_completed}
                />
                <MiniStat
                  icon={Flame}
                  label="当前连续"
                  value={detail.streak?.current ?? 0}
                  suffix="天"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Radar + Activity Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar chart */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
              <h3 className="font-semibold mb-4 text-sm">能力雷达图</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Radar
                      dataKey="value"
                      stroke={BRAND_COLORS.dark.primary}
                      fill={BRAND_COLORS.dark.primary}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity calendar */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
              <h3 className="font-semibold mb-4 text-sm">近30天活跃日历</h3>
              <div className="grid grid-cols-7 gap-1.5">
                {last30Days.map((day) => {
                  const key = day.toISOString().slice(0, 10);
                  const isActive = activityDays.has(key);
                  const isToday = key === new Date().toISOString().slice(0, 10);
                  return (
                    <div
                      key={key}
                      title={`${day.toLocaleDateString('zh-CN')}${isActive ? ' (活跃)' : ''}`}
                      className={cn(
                        'aspect-square rounded-md flex items-center justify-center text-[10px]',
                        isActive
                          ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                          : 'bg-muted/30 text-muted-foreground/50',
                        isToday && 'ring-1 ring-indigo-400/60',
                      )}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500/40" />
                  活跃
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-muted/30" />
                  无活动
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Recent actions timeline */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <h3 className="font-semibold mb-4 text-sm">最近操作记录</h3>
            {detail.recent_actions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无操作记录</p>
            ) : (
              <div className="space-y-0">
                {detail.recent_actions.slice(0, 50).map((action, idx) => (
                  <div
                    key={`${action.created_at}-${idx}`}
                    className={cn(
                      'flex items-start gap-3 py-3',
                      idx > 0 && 'border-t border-border/30',
                    )}
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 w-16 shrink-0">
                      {relativeTime(action.created_at)}
                    </span>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap shrink-0',
                      getActionBadgeColor(action.action_type),
                    )}>
                      {ACTION_LABELS[action.action_type] ?? action.action_type}
                    </span>
                    <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
                      {action.description || '—'}
                    </span>
                    {action.points !== 0 && (
                      <span className={cn(
                        'text-xs font-medium shrink-0',
                        action.points > 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                        {action.points > 0 ? '+' : ''}{action.points}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini stat helper
// ---------------------------------------------------------------------------

function MiniStat({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2.5 text-center">
      <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
      <p className="text-lg font-bold leading-tight">
        {value.toLocaleString('zh-CN')}
        {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[140px] rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}
