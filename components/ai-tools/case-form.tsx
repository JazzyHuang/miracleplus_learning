'use client';

import { useState, useCallback } from 'react';
import { Send, Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CaseFormProps {
  toolId: string;
  toolName: string;
  userId: string;
  onSuccess?: () => void;
}

/**
 * AI工具应用案例提交表单
 * 
 * 案例包含: 标题、问题背景、解决方案、效果描述
 * 提交后默认 pending 状态, 管理员审核后 approved 显示
 * 积分: 案例 approved 后 +100 分 (TOOL_CASE)
 */
export function CaseForm({ toolId, toolName, userId, onSuccess }: CaseFormProps) {
  const [title, setTitle] = useState('');
  const [problemBackground, setProblemBackground] = useState('');
  const [solution, setSolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (title.trim().length < 10) {
      toast.error('标题至少 10 个字');
      return;
    }
    if (problemBackground.trim().length < 50) {
      toast.error('问题背景至少 50 个字');
      return;
    }
    if (solution.trim().length < 50) {
      toast.error('解决方案至少 50 个字');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from(DB.tool_cases).insert({
        user_id: userId,
        tool_id: toolId,
        title: title.trim(),
        problem_background: problemBackground.trim(),
        solution: solution.trim(),
        status: 'pending',
      });

      if (error) throw error;
      toast.success('案例已提交, 审核通过后将展示并获得积分');
      setTitle('');
      setProblemBackground('');
      setSolution('');
      onSuccess?.();
    } catch {
      toast.error('提交失败, 请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, problemBackground, solution, userId, toolId, onSuccess]);

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h3 className="font-medium text-card-foreground text-sm">分享应用案例</h3>
        <span className="text-xs text-muted-foreground">审核通过后 +100 积分</span>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="案例标题 (10-100字)"
          maxLength={100}
          className="w-full h-10 px-3 rounded-lg bg-muted border border-border/50 text-card-foreground placeholder:text-muted-foreground/70 text-sm focus:outline-none focus:border-primary/30 transition-colors"
        />
        <textarea
          value={problemBackground}
          onChange={(e) => setProblemBackground(e.target.value)}
          placeholder={`使用 ${toolName} 解决了什么问题? (问题背景, 50-1000字)`}
          maxLength={1000}
          className="w-full h-24 px-3 py-2 rounded-lg bg-muted border border-border/50 text-card-foreground placeholder:text-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary/30 transition-colors"
        />
        <textarea
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          placeholder="你是怎么用这个工具解决的? (解决方案, 50-2000字)"
          maxLength={2000}
          className="w-full h-24 px-3 py-2 rounded-lg bg-muted border border-border/50 text-card-foreground placeholder:text-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary/30 transition-colors"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70">
          {title.length + problemBackground.length + solution.length} 字
        </span>
        <Button
          size="sm"
          variant="brand"
          disabled={title.trim().length < 10 || problemBackground.trim().length < 50 || solution.trim().length < 50 || isSubmitting}
          onClick={handleSubmit}
          className="gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {isSubmitting ? '提交中...' : '提交案例'}
        </Button>
      </div>
    </div>
  );
}
