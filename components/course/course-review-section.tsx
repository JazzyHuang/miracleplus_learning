'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageSquare, Send, Award } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LikeButton } from '@/components/common/like-button';
import { createCoursesService } from '@/lib/courses';
import { cn } from '@/lib/utils';
import type { User } from '@/types/database';

interface CourseReview {
  id: string;
  user_id: string;
  content: string;
  is_featured: boolean;
  like_count: number;
  created_at: string;
  user: User;
}

interface CourseReviewSectionProps {
  courseId: string;
  className?: string;
}

/**
 * 课程感想发表区组件
 */
export function CourseReviewSection({ courseId, className }: CourseReviewSectionProps) {
  const { user } = useUser();
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    const supabase = createClient();
    const coursesService = createCoursesService(supabase);
    
    const data = await coursesService.getCourseReviews(courseId);
    setReviews(data as CourseReview[]);
    
    // 检查当前用户是否已发表
    if (user) {
      const reviewed = await coursesService.hasUserReviewed(user.id, courseId);
      setHasReviewed(reviewed);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [courseId, user]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (newReview.trim().length < 50) {
      toast.error('感想内容至少 50 字');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const coursesService = createCoursesService(supabase);
      
      const result = await coursesService.submitCourseReview(
        user.id,
        courseId,
        newReview.trim()
      );

      if (!result.success) {
        toast.error(result.error || '提交失败');
        return;
      }

      toast.success(`感想发表成功！+${result.pointsEarned} 积分`);
      setNewReview('');
      setHasReviewed(true);
      fetchReviews();
    } catch (err) {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn('border-0 shadow-md', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-0 shadow-md', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
          学习感想
          <Badge variant="secondary" className="ml-2">
            {reviews.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 发表感想 */}
        {user && !hasReviewed && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <Textarea
              placeholder="分享你学习这门课程的感想和收获...（至少 50 字）"
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className={cn(
                'text-sm',
                newReview.length < 50 ? 'text-muted-foreground' : 'text-green-500'
              )}>
                {newReview.length}/50 字
              </span>
              <Button
                onClick={handleSubmit}
                disabled={submitting || newReview.trim().length < 50}
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? '提交中...' : '发表感想'}
                <span className="ml-2 text-xs text-amber-400">+50</span>
              </Button>
            </div>
          </div>
        )}

        {user && hasReviewed && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-sm">
            ✓ 你已经发表过这门课程的感想
          </div>
        )}

        {!user && (
          <div className="p-4 rounded-lg bg-muted text-center text-muted-foreground">
            登录后可以发表感想
          </div>
        )}

        {/* 感想列表 */}
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            还没有感想，来说说你的学习心得吧~
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {reviews.map((review, index) => (
                <m.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-4 rounded-lg',
                    review.is_featured
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                      : 'bg-muted/30'
                  )}
                >
                  {/* 精选标记 */}
                  {review.is_featured && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs mb-2">
                      <Award className="w-3 h-3" />
                      精选感想
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={review.user.avatar_url || undefined} />
                      <AvatarFallback>
                        {review.user.name?.[0] || review.user.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {review.user.name || review.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), 'MM月dd日', { locale: zhCN })}
                        </span>
                      </div>

                      <p className="text-sm whitespace-pre-wrap">{review.content}</p>

                      <div className="mt-2">
                        <LikeButton
                          targetType="review"
                          targetId={review.id}
                          initialCount={review.like_count}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
