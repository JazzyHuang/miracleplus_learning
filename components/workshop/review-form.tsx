'use client';

import { useState, useCallback } from 'react';
import { FileText, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { awardPointsAction } from '@/app/actions/points';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReviewFormProps {
  workshopId: string;
  userId: string;
  onSuccess?: () => void;
}

/**
 * Workshop 课后复盘提交表单
 * 
 * 用户提交学习总结，获得 +50 积分 (WORKSHOP_REVIEW)。
 */
export function WorkshopReviewForm({ workshopId, userId, onSuccess }: ReviewFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (content.trim().length < 50) {
      toast.error('复盘内容至少 50 字');
      return;
    }
    if (content.length > 2000) {
      toast.error('复盘内容不能超过 2000 字');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Check if already submitted
      const { data: existing } = await supabase
        .from(DB.workshop_submissions)
        .select('id')
        .eq('user_id', userId)
        .eq('workshop_id', workshopId)
        .eq('type', 'review')
        .single();

      if (existing) {
        toast.error('你已经提交过复盘了');
        return;
      }

      // Submit review as a special submission type
      const { error } = await supabase
        .from(DB.workshop_submissions)
        .insert({
          user_id: userId,
          workshop_id: workshopId,
          content,
          type: 'review',
          status: 'approved',
        });

      if (error) throw error;

      // Award points via Server Action
      await awardPointsAction('WORKSHOP_REVIEW', workshopId, 'workshop', 'Workshop 课后复盘');

      toast.success('复盘提交成功！+50 积分');
      setContent('');
      onSuccess?.();
    } catch (_err) {
      toast.error('提交失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, userId, workshopId, onSuccess]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-card-foreground">课后复盘</h3>
        <span className="text-xs text-muted-foreground">提交后可获得 50 积分</span>
      </div>

      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的学习总结和收获..."
          className="w-full h-32 px-4 py-3 rounded-lg bg-card border border-border/50 text-card-foreground placeholder:text-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-colors shadow-sm"
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${content.length < 50 ? 'text-muted-foreground/70' : content.length > 2000 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {content.length} / 2000 字 (最少 50 字)
          </span>
          <Button
            variant="brand"
            size="sm"
            disabled={content.trim().length < 50 || isSubmitting}
            onClick={handleSubmit}
            className="gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? '提交中...' : '提交复盘'}
          </Button>
        </div>
      </div>
    </div>
  );
}
