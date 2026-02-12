'use client';

import { useState, useCallback } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import {
  AnalyticsDateFilter,
  OverviewTab,
  ActivityTrendsTab,
  RetentionTab,
  FunnelTab,
  ContentTab,
  SegmentsTab,
  UserProfileTab,
} from '@/components/admin/analytics';

const TABS = [
  { id: 'overview', label: '概览' },
  { id: 'trends', label: '活跃趋势' },
  { id: 'retention', label: '留存分析' },
  { id: 'funnel', label: '学习漏斗' },
  { id: 'content', label: '内容分析' },
  { id: 'segments', label: '用户分群' },
  { id: 'profile', label: '用户画像' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [days, setDays] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    invalidateCacheByPrefix('analytics-');
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> 运营数据
          </h1>
          <p className="text-sm text-muted-foreground mt-1">平台用户行为深度分析</p>
        </div>
        <div className="flex items-center gap-2">
          <AnalyticsDateFilter value={days} onChange={setDays} />
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border/50 pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div key={refreshKey}>
        {activeTab === 'overview' && <OverviewTab days={days} />}
        {activeTab === 'trends' && <ActivityTrendsTab days={days} />}
        {activeTab === 'retention' && <RetentionTab />}
        {activeTab === 'funnel' && <FunnelTab days={days} />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'segments' && <SegmentsTab />}
        {activeTab === 'profile' && <UserProfileTab />}
      </div>
    </div>
  );
}
