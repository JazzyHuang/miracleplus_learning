'use client';

import { useState, useCallback } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function AdminAnalyticsPage() {
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
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            刷新
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="overflow-x-auto w-full justify-start">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="trends">活跃趋势</TabsTrigger>
          <TabsTrigger value="retention">留存分析</TabsTrigger>
          <TabsTrigger value="funnel">学习漏斗</TabsTrigger>
          <TabsTrigger value="content">内容分析</TabsTrigger>
          <TabsTrigger value="segments">用户分群</TabsTrigger>
          <TabsTrigger value="profile">用户画像</TabsTrigger>
        </TabsList>

        <div key={refreshKey} className="mt-4">
          <TabsContent value="overview"><OverviewTab days={days} /></TabsContent>
          <TabsContent value="trends"><ActivityTrendsTab days={days} /></TabsContent>
          <TabsContent value="retention"><RetentionTab /></TabsContent>
          <TabsContent value="funnel"><FunnelTab days={days} /></TabsContent>
          <TabsContent value="content"><ContentTab /></TabsContent>
          <TabsContent value="segments"><SegmentsTab /></TabsContent>
          <TabsContent value="profile"><UserProfileTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
