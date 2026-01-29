'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  HelpCircle,
  MessageCircle,
  Send,
  Star,
  Check,
  Award,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LikeButton } from '@/components/common/like-button';
import { createCoursesService } from '@/lib/courses';
import { cn } from '@/lib/utils';
import type { User } from '@/types/database';

interface Question {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  content: string;
  bounty_points: number;
  is_resolved: boolean;
  accepted_answer_id: string | null;
  view_count: number;
  answer_count: number;
  created_at: string;
  user: User;
}

interface Answer {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  is_featured: boolean;
  is_accepted: boolean;
  like_count: number;
  created_at: string;
  user: User;
}

interface CourseQASectionProps {
  courseId: string;
  lessonId?: string;
  className?: string;
}

/**
 * 课程问答专区组件
 */
export function CourseQASection({ courseId, lessonId, className }: CourseQASectionProps) {
  const { user } = useUser();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAskDialog, setShowAskDialog] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const fetchQuestions = async () => {
    const supabase = createClient();
    
    let query = supabase
      .from('qa_questions')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取问答列表失败:', error);
    } else {
      setQuestions(data as Question[]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [courseId, lessonId]);

  if (loading) {
    return (
      <Card className={cn('border-0 shadow-md', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('border-0 shadow-md', className)}>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            问答专区
            <Badge variant="secondary" className="ml-2">
              {questions.length}
            </Badge>
          </CardTitle>
          {user && (
            <Button size="sm" onClick={() => setShowAskDialog(true)}>
              <HelpCircle className="w-4 h-4 mr-2" />
              提问
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!user && (
            <div className="p-4 rounded-lg bg-muted text-center text-muted-foreground">
              登录后可以提问和回答
            </div>
          )}

          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              还没有问题，有疑问就来提问吧~
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  currentUserId={user?.id}
                  expanded={expandedQuestion === question.id}
                  onToggle={() =>
                    setExpandedQuestion(
                      expandedQuestion === question.id ? null : question.id
                    )
                  }
                  onRefresh={fetchQuestions}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提问对话框 */}
      <AskQuestionDialog
        open={showAskDialog}
        onClose={() => setShowAskDialog(false)}
        courseId={courseId}
        lessonId={lessonId}
        onSuccess={() => {
          setShowAskDialog(false);
          fetchQuestions();
        }}
      />
    </>
  );
}

/**
 * 问题卡片组件
 */
function QuestionCard({
  question,
  currentUserId,
  expanded,
  onToggle,
  onRefresh,
}: {
  question: Question;
  currentUserId?: string;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [newAnswer, setNewAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const isAuthor = currentUserId === question.user_id;

  const fetchAnswers = async () => {
    if (answers.length > 0) return;
    
    setLoadingAnswers(true);
    const supabase = createClient();
    
    const { data } = await supabase
      .from('qa_answers')
      .select(`
        *,
        user:users (id, name, email, avatar_url)
      `)
      .eq('question_id', question.id)
      .order('is_accepted', { ascending: false })
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: true });

    setAnswers(data as Answer[] || []);
    setLoadingAnswers(false);
  };

  useEffect(() => {
    if (expanded) {
      fetchAnswers();
    }
  }, [expanded]);

  const handleSubmitAnswer = async () => {
    if (!currentUserId) {
      toast.error('请先登录');
      return;
    }

    if (newAnswer.trim().length < 20) {
      toast.error('回答内容至少 20 字');
      return;
    }

    setSubmittingAnswer(true);

    try {
      const supabase = createClient();
      const coursesService = createCoursesService(supabase);
      
      const result = await coursesService.submitAnswer(
        currentUserId,
        question.id,
        newAnswer.trim()
      );

      if (!result.success) {
        toast.error(result.error || '提交失败');
        return;
      }

      toast.success('回答成功！+30 积分');
      setNewAnswer('');
      setAnswers([]);
      fetchAnswers();
      onRefresh();
    } catch (err) {
      toast.error('提交失败');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!currentUserId) return;

    try {
      const supabase = createClient();
      const coursesService = createCoursesService(supabase);
      
      const result = await coursesService.acceptAnswer(
        currentUserId,
        question.id,
        answerId
      );

      if (result.success) {
        toast.success('已采纳答案');
        setAnswers([]);
        fetchAnswers();
        onRefresh();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (err) {
      toast.error('操作失败');
    }
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'rounded-lg border',
        question.is_resolved
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
          : 'border-border'
      )}
    >
      {/* 问题头部 */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={question.user.avatar_url || undefined} />
            <AvatarFallback>
              {question.user.name?.[0] || question.user.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{question.title}</span>
              {question.is_resolved && (
                <Badge className="bg-green-500 text-white">
                  <Check className="w-3 h-3 mr-1" />
                  已解决
                </Badge>
              )}
              {question.bounty_points > 0 && !question.is_resolved && (
                <Badge variant="outline" className="text-amber-500 border-amber-500">
                  <Star className="w-3 h-3 mr-1" />
                  悬赏 {question.bounty_points}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {question.content}
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{question.user.name || question.user.email}</span>
              <span>{format(new Date(question.created_at), 'MM月dd日', { locale: zhCN })}</span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {question.answer_count} 回答
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {question.view_count} 浏览
              </span>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="ml-auto">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 展开的回答区 */}
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* 回答列表 */}
              {loadingAnswers ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : answers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  暂无回答，来回答这个问题吧
                </p>
              ) : (
                <div className="space-y-3">
                  {answers.map((answer) => (
                    <div
                      key={answer.id}
                      className={cn(
                        'p-3 rounded-lg',
                        answer.is_accepted
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                          : answer.is_featured
                          ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                          : 'bg-muted/50'
                      )}
                    >
                      {answer.is_accepted && (
                        <div className="flex items-center gap-1 text-green-600 text-xs mb-2">
                          <Check className="w-3 h-3" />
                          已采纳
                        </div>
                      )}
                      {answer.is_featured && !answer.is_accepted && (
                        <div className="flex items-center gap-1 text-amber-600 text-xs mb-2">
                          <Award className="w-3 h-3" />
                          精选回答
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={answer.user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {answer.user.name?.[0] || answer.user.email?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {answer.user.name || answer.user.email}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(answer.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{answer.content}</p>

                          <div className="flex items-center gap-2 mt-2">
                            <LikeButton
                              targetType="comment"
                              targetId={answer.id}
                              initialCount={answer.like_count}
                              iconType="thumbsUp"
                              size="sm"
                            />
                            {isAuthor && !question.is_resolved && !answer.is_accepted && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAcceptAnswer(answer.id)}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                采纳
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 回答输入框 */}
              {currentUserId && !question.is_resolved && (
                <div className="space-y-2 pt-4 border-t">
                  <Textarea
                    placeholder="写下你的回答...（至少 20 字）"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {newAnswer.length}/20 字
                    </span>
                    <Button
                      size="sm"
                      onClick={handleSubmitAnswer}
                      disabled={submittingAnswer || newAnswer.trim().length < 20}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submittingAnswer ? '提交中...' : '提交回答'}
                      <span className="ml-2 text-xs text-amber-400">+30</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

/**
 * 提问对话框
 */
function AskQuestionDialog({
  open,
  onClose,
  courseId,
  lessonId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  lessonId?: string;
  onSuccess: () => void;
}) {
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bounty, setBounty] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (!title.trim()) {
      toast.error('请输入问题标题');
      return;
    }

    if (content.trim().length < 20) {
      toast.error('问题内容至少 20 字');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const coursesService = createCoursesService(supabase);
      
      const result = await coursesService.submitQuestion(user.id, courseId, {
        title: title.trim(),
        content: content.trim(),
        lessonId,
        bountyPoints: bounty,
      });

      if (!result.success) {
        toast.error(result.error || '提问失败');
        return;
      }

      toast.success('提问成功！+15 积分');
      setTitle('');
      setContent('');
      setBounty(0);
      onSuccess();
    } catch (err) {
      toast.error('提问失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            提问
          </DialogTitle>
          <DialogDescription>
            有疑问就来提问，获得其他学员或讲师的解答
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">问题标题 *</Label>
            <Input
              id="title"
              placeholder="简洁描述你的问题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">问题详情 *</Label>
            <Textarea
              id="content"
              placeholder="详细描述你的问题（至少 20 字）"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className={cn(
              'text-xs',
              content.length < 20 ? 'text-muted-foreground' : 'text-green-500'
            )}>
              {content.length}/20 字
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bounty" className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              悬赏积分（可选）
            </Label>
            <Input
              id="bounty"
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={bounty || ''}
              onChange={(e) => setBounty(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            />
            <p className="text-xs text-muted-foreground">
              设置悬赏可以吸引更多人回答，被采纳的答案作者将获得悬赏积分
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交问题'}
            <span className="ml-2 text-xs text-amber-400">+15</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
