'use client';

import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { FileText, Play, ExternalLink, HelpCircle, CheckCircle2, Circle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { useCachedQuery, invalidateCache } from '@/hooks/use-cached-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: 'document' | 'video' | 'link' | 'quiz';
  url: string | null;
  is_required: boolean;
  order_index: number;
}

interface MaterialProgress {
  material_id: string;
  completed: boolean;
}

interface MaterialsSectionProps {
  workshopId: string;
  userId?: string;
}

const TYPE_CONFIG = {
  document: { icon: FileText, label: '文档', color: 'text-blue-400 bg-blue-500/10' },
  video: { icon: Play, label: '视频', color: 'text-violet-400 bg-violet-500/10' },
  link: { icon: ExternalLink, label: '链接', color: 'text-emerald-400 bg-emerald-500/10' },
  quiz: { icon: HelpCircle, label: '测验', color: 'text-amber-400 bg-amber-500/10' },
} as const;

/**
 * Workshop 预习材料展示组件
 * 
 * 显示Workshop的预习材料列表，支持完成状态追踪。
 */
export function MaterialsSection({ workshopId, userId }: MaterialsSectionProps) {
  const [completing, setCompleting] = useState<string | null>(null);

  // Fetch materials
  const { data: materials } = useCachedQuery<Material[]>(
    `workshop-materials-${workshopId}`,
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from(DB.workshop_materials)
        .select('*')
        .eq('workshop_id', workshopId)
        .order('order_index');
      return data ?? [];
    },
    { ttl: 60000 }
  );

  // Fetch user progress
  const { data: progress, refetch: refetchProgress } = useCachedQuery<MaterialProgress[]>(
    `material-progress-${workshopId}-${userId}`,
    async () => {
      if (!userId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from(DB.user_material_progress)
        .select('material_id, completed')
        .eq('user_id', userId)
        .eq('workshop_id', workshopId);
      return data ?? [];
    },
    { ttl: 30000, enabled: !!userId }
  );

  const completedIds = new Set((progress ?? []).filter(p => p.completed).map(p => p.material_id));
  const requiredMaterials = (materials ?? []).filter(m => m.is_required);
  const allRequiredDone = requiredMaterials.length > 0 && requiredMaterials.every(m => completedIds.has(m.id));

  const handleComplete = useCallback(async (materialId: string) => {
    if (!userId) return;
    setCompleting(materialId);
    try {
      const supabase = createClient();
      await supabase.from(DB.user_material_progress).upsert({
        user_id: userId,
        workshop_id: workshopId,
        material_id: materialId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,material_id' });

      invalidateCache(`material-progress-${workshopId}-${userId}`);
      refetchProgress();
      toast.success('已标记完成');
    } catch {
      toast.error('标记失败');
    } finally {
      setCompleting(null);
    }
  }, [userId, workshopId, refetchProgress]);

  if (!materials || materials.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          预习材料
        </h3>
        {allRequiredDone && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            必修已完成
          </span>
        )}
      </div>

      <div className="space-y-2">
        {materials.map((material, index) => {
          const config = TYPE_CONFIG[material.type];
          const Icon = config.icon;
          const isCompleted = completedIds.has(material.id);

          return (
            <m.div
              key={material.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isCompleted
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-foreground/[0.02] border-border hover:bg-foreground/[0.04]'
              }`}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Type icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {material.title}
                  </span>
                  {material.is_required && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                      必修
                    </span>
                  )}
                </div>
                {material.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{material.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {material.url && (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {userId && !isCompleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    disabled={completing === material.id}
                    onClick={() => handleComplete(material.id)}
                  >
                    {completing === material.id ? '...' : '完成'}
                  </Button>
                )}
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
