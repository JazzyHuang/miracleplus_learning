'use client';

import { m } from 'framer-motion';
import { Mic, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ApprovedInstructor {
  id: string;
  topic: string;
  user: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * 往期讲师风采展示 - 水平滚动区域
 * 
 * 在 Workshop 首页入口处展示已通过审核的讲师。
 * 使用 CSS snap scrolling 实现丝滑水平滚动。
 */
export function InstructorShowcase() {
  const { data: instructors } = useCachedQuery<ApprovedInstructor[]>(
    'approved-instructors',
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from(DB.instructor_applications)
        .select(`id, topic, user:${DB.users}(name, avatar_url)`)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(10);
      return (data as unknown as ApprovedInstructor[]) ?? [];
    },
    { ttl: 300000 }
  );

  if (!instructors || instructors.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-card-foreground">讲师风采</h3>
        </div>
        <Link
          href="/workshop/apply-instructor"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary transition-colors"
        >
          申请成为讲师
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Horizontal scrolling showcase */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none -mx-1 px-1">
        {instructors.map((instructor, index) => (
          <m.div
            key={instructor.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-none snap-start w-48 rounded-xl border border-border/50 bg-card p-4 hover:border-primary/20 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-10 h-10 border border-border/50">
                <AvatarImage src={instructor.user?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {instructor.user?.name?.[0] ?? 'T'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {instructor.user?.name ?? '讲师'}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{instructor.topic}</p>
          </m.div>
        ))}

        {/* CTA card */}
        <Link href="/workshop/apply-instructor" className="flex-none snap-start">
          <div className="w-48 h-full rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-colors shadow-sm">
            <Mic className="w-6 h-6 text-primary" />
            <p className="text-xs text-primary text-center">成为讲师<br/>+400 积分</p>
          </div>
        </Link>
      </div>
    </m.div>
  );
}
