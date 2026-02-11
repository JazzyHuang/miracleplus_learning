'use client';

import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { GitCompareArrows, Plus, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery, invalidateCacheByPrefix } from '@/hooks/use-cached-query';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { DB } from '@/lib/db-tables';
import { awardPointsAction } from '@/app/actions/points';

interface Tool {
  id: string;
  name: string;
  slug: string;
}

interface Comparison {
  id: string;
  user_id: string;
  tool_ids: string[];
  comparison_content: Record<string, unknown>;
  created_at: string;
  user: { name: string | null } | null;
}

export default function ComparePage() {
  const { user } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [comparisonText, setComparisonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const { data: tools } = useCachedQuery<Tool[]>(
    'all-tools-for-compare',
    async () => {
      const { data } = await supabase.from(DB.ai_tools).select('id, name, slug').order('name');
      return (data as Tool[]) ?? [];
    },
    { ttl: 300000 }
  );

  const { data: comparisons, refetch } = useCachedQuery<Comparison[]>(
    'tool-comparisons',
    async () => {
      const { data } = await supabase
        .from(DB.tool_comparisons)
        .select(`id, user_id, tool_ids, comparison_content, created_at, user:${DB.users}(name)`)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data as unknown as Comparison[]) ?? [];
    },
    { ttl: 30000 }
  );

  const addTool = (tool: Tool) => {
    if (selectedTools.length >= 3) { toast.error('最多对比 3 款工具'); return; }
    if (selectedTools.find(t => t.id === tool.id)) return;
    setSelectedTools([...selectedTools, tool]);
  };

  const removeTool = (id: string) => setSelectedTools(selectedTools.filter(t => t.id !== id));

  const handleSubmit = useCallback(async () => {
    if (!user || selectedTools.length < 2) { toast.error('请至少选择 2 款工具'); return; }
    if (comparisonText.trim().length < 50) { toast.error('对比内容至少 50 字'); return; }
    setIsSubmitting(true);
    try {
      await supabase.from(DB.tool_comparisons).insert({
        user_id: user.id,
        tool_ids: selectedTools.map(t => t.id),
        comparison_content: {
          text: comparisonText,
          tool_names: selectedTools.map(t => t.name),
        },
      });
      // Insert returns the new row; we need the ID for the points action
      // Re-query to get the comparison ID
      const { data: newComparison } = await supabase
        .from(DB.tool_comparisons)
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (newComparison) {
        await awardPointsAction('TOOL_COMPARISON', newComparison.id, 'tool_comparison', `工具对比: ${selectedTools.map(t => t.name).join(' vs ')}`);
      }
      toast.success('对比已发布！+120 积分');
      setShowForm(false); setSelectedTools([]); setComparisonText('');
      invalidateCacheByPrefix('tool-comparisons'); refetch();
    } catch { toast.error('提交失败'); }
    finally { setIsSubmitting(false); }
  }, [user, selectedTools, comparisonText, supabase, refetch]);

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="工具对比" description="对比 2-3 款同类 AI 工具" icon={GitCompareArrows} />
        {user && !showForm && (
          <Button className="gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> 发起对比</Button>
        )}
      </div>

      {showForm && (
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
          <h3 className="font-medium text-card-foreground">选择要对比的工具 (2-3 款)</h3>
          <div className="flex flex-wrap gap-2">
            {selectedTools.map(t => (
              <span key={t.id} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                {t.name}
                <button onClick={() => removeTool(t.id)}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {selectedTools.length < 3 && (
              <select onChange={e => { const t = tools?.find(x => x.id === e.target.value); if (t) addTool(t); e.target.value = ''; }}
                className="h-8 px-3 rounded-full bg-muted border border-border/50 text-sm text-muted-foreground">
                <option value="">+ 添加工具</option>
                {(tools ?? []).filter(t => !selectedTools.find(s => s.id === t.id)).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
          <textarea value={comparisonText} onChange={e => setComparisonText(e.target.value)}
            placeholder="从功能、价格、优缺点、适用场景等方面进行对比... (至少 50 字)"
            className="w-full h-32 px-4 py-3 rounded-lg bg-background border border-border/50 text-card-foreground text-sm resize-none focus:outline-none focus:border-primary/30" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>取消</Button>
            <Button variant="brand" disabled={selectedTools.length < 2 || comparisonText.trim().length < 50 || isSubmitting}
              onClick={handleSubmit} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> {isSubmitting ? '提交中...' : '发布对比'}
            </Button>
          </div>
        </m.div>
      )}

      {(!comparisons || comparisons.length === 0) ? (
        <EmptyState title="暂无对比" description="发起你的第一个工具对比" />
      ) : (
        <div className="space-y-4">
          {comparisons.map((c, i) => (
            <m.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 bg-card p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                {((c.comparison_content as { tool_names?: string[] }).tool_names ?? []).map((name, j) => (
                  <span key={j}>
                    {j > 0 && <span className="text-muted-foreground/70 mx-1">vs</span>}
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{name}</span>
                  </span>
                ))}
              </div>
              <p className="text-sm text-card-foreground/80 whitespace-pre-wrap">
                {(c.comparison_content as { text?: string }).text}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <span>{c.user?.name ?? '匿名'}</span>
                <span>{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </m.div>
          ))}
        </div>
      )}
    </div>
  );
}
