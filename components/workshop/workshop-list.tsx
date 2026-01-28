'use client';

import { Suspense, useState } from 'react';
import { CalendarDays, Mic } from 'lucide-react';
import { WorkshopCard } from './workshop-card';
import { InstructorApplyForm } from './instructor-apply-form';
import { PageHeader, SearchInput } from '@/components/common';
import { useFilter, getAnimationDelay } from '@/hooks/use-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/contexts/user-context';
import type { Workshop } from '@/types/database';

interface WorkshopListProps {
  workshops: Workshop[];
  searchQuery?: string;
}

export function WorkshopList({ workshops, searchQuery = '' }: WorkshopListProps) {
  const { user } = useUser();
  const [showInstructorForm, setShowInstructorForm] = useState(false);
  
  // 使用通用过滤 Hook
  const filteredWorkshops = useFilter(workshops, searchQuery, ['title', 'description']);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header - 使用通用 PageHeader */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <PageHeader
          icon={CalendarDays}
          title="Workshop 活动"
          description="参与线下活动，记录学习足迹"
        />
        {user && (
          <Button 
            variant="outline" 
            onClick={() => setShowInstructorForm(true)}
            className="shrink-0"
          >
            <Mic className="w-4 h-4 mr-2" />
            申请成为讲师
          </Button>
        )}
      </div>

      {/* Search - 使用通用 SearchInput */}
      <div className="mb-6">
        <Suspense fallback={<div className="h-12 bg-muted rounded-lg animate-pulse max-w-md" />}>
          <SearchInput placeholder="搜索活动..." />
        </Suspense>
      </div>

      {/* Workshop Grid */}
      {filteredWorkshops.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={searchQuery ? '没有找到匹配的活动' : '暂无活动'}
          description={searchQuery ? '尝试使用其他关键词搜索' : '活动正在准备中'}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkshops.map((workshop, index) => (
            <div 
              key={workshop.id} 
              className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: getAnimationDelay(index) }}
            >
              {/* 前3个活动设置 priority=true 以优化 LCP */}
              <WorkshopCard workshop={workshop} priority={index < 3} />
            </div>
          ))}
        </div>
      )}

      {/* 讲师招募卡片 */}
      {user && (
        <Card className="mt-12 border-0 shadow-lg bg-gradient-to-br from-violet-50 via-purple-50 to-transparent dark:from-violet-950/20 dark:via-purple-950/10">
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold mb-2">成为 Workshop 讲师</h3>
              <p className="text-muted-foreground">
                分享你的知识和经验，成为讲师可获得 400 积分和专属徽章！
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => setShowInstructorForm(true)}
            >
              立即申请
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 讲师申请表单 */}
      <InstructorApplyForm
        open={showInstructorForm}
        onClose={() => setShowInstructorForm(false)}
      />
    </div>
  );
}
