'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Gift, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { createQuestsService, QUEST_LABELS, ALL_COMPLETE_BONUS_POINTS, type DailyQuest } from '@/lib/points/quests';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * 每日任务卡片 — Dashboard widget
 */
export function DailyQuests() {
  const { user } = useUser();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const supabase = createClient();
    const service = createQuestsService(supabase);
    service.getTodayQuests(user.id).then(data => {
      if (!cancelled) {
        setQuests(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  const completedCount = quests.filter(q => q.completedAt).length;
  const allComplete = quests.length > 0 && completedCount === quests.length;

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border/50 shadow-theme-sm p-5 space-y-3 animate-pulse">
        <div className="h-5 w-24 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    );
  }

  if (quests.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border/50 shadow-theme-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-card-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          每日任务
        </h3>
        <span className="text-xs text-muted-foreground">{completedCount}/{quests.length}</span>
      </div>

      <div className="space-y-3">
        {quests.map(quest => {
          const isComplete = !!quest.completedAt;
          const progress = Math.min((quest.currentCount / quest.targetCount) * 100, 100);

          return (
            <div key={quest.id} className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-sm truncate',
                    isComplete ? 'text-muted-foreground line-through' : 'text-card-foreground'
                  )}>
                    {QUEST_LABELS[quest.questType] || quest.questType}
                  </span>
                  <span className="text-xs text-primary font-medium ml-2 shrink-0">
                    +{quest.bonusPoints}
                  </span>
                </div>
                {!isComplete && quest.targetCount > 1 && (
                  <Progress value={progress} variant="brand" className="h-1 mt-1" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 全部完成奖励 */}
      <div className={cn(
        'mt-4 pt-3 border-t border-border/30 flex items-center gap-2',
        allComplete ? 'text-success' : 'text-muted-foreground/50'
      )}>
        <Gift className="w-4 h-4" />
        <span className="text-xs">
          {allComplete ? '全部完成！' : '全部完成额外奖励'}
        </span>
        <span className="text-xs font-medium ml-auto">+{ALL_COMPLETE_BONUS_POINTS}</span>
      </div>
    </div>
  );
}
