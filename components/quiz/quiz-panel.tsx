'use client';

import { useState, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, RefreshCw, Trophy, FileQuestion } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DB } from '@/lib/db-tables';
import { awardPointsAction } from '@/app/actions/points';
import { QuizQuestion } from './quiz-question';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { logger } from '@/lib/logger';
import type { Question } from '@/types/database';

interface QuizPanelProps {
  lessonId: string;
  questions: Question[];
  userId?: string;
}

interface UserAnswers {
  [questionId: string]: string | string[];
}

interface QuizResults {
  [questionId: string]: boolean;
}

/**
 * Quiz 面板组件
 * 
 * Phase 3 改进：
 * 1. 添加答题进度指示器
 * 2. 使用确认对话框替代隐式重置
 * 3. localStorage 写入添加防抖
 * 4. 优化动画延迟
 */
export function QuizPanel({ lessonId, questions, userId }: QuizPanelProps) {
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [results, setResults] = useState<QuizResults | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Phase 3: 确认对话框
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  
  // Phase 3: localStorage 防抖
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // localStorage 键名 - 包含用户 ID 避免多用户冲突
  const storageKey = userId 
    ? `quiz-answers-${lessonId}-${userId}` 
    : `quiz-answers-${lessonId}-guest`;
  
  // 计算答题进度
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const unansweredCount = totalQuestions - answeredCount;
  const answerProgress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // 加载历史答案
  useEffect(() => {
    const loadAnswers = async () => {
      // 1. 先尝试从 localStorage 加载临时答案
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed);
        }
      } catch {
        // localStorage 读取失败，忽略
      }

      // 2. 如果用户已登录，从数据库加载历史答案
      if (userId) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from(DB.user_answers)
            .select('question_id, answer, is_correct')
            .eq('user_id', userId)
            .in('question_id', questions.map(q => q.id));

          if (data && data.length > 0) {
            const loadedAnswers: UserAnswers = {};
            const loadedResults: QuizResults = {};
            
            data.forEach((item: { question_id: string; answer: string[]; is_correct: boolean }) => {
              loadedAnswers[item.question_id] = item.answer;
              loadedResults[item.question_id] = item.is_correct;
            });

            setAnswers(loadedAnswers);
            setResults(loadedResults);
            
            // 如果所有题目都有答案，标记为已提交
            if (Object.keys(loadedResults).length === questions.length) {
              setSubmitted(true);
            }
          }
        } catch (error) {
          logger.error('加载答题历史失败:', error);
        }
      }

      setLoadingHistory(false);
    };

    loadAnswers();
  }, [userId, lessonId, questions, storageKey]);

  // Phase 3: 保存临时答案到 localStorage（添加防抖）
  useEffect(() => {
    if (!submitted && Object.keys(answers).length > 0) {
      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // 500ms 防抖
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(answers));
        } catch {
          // localStorage 写入失败，忽略
        }
      }, 500);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [answers, submitted, storageKey]);

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const checkAnswer = (question: Question, userAnswer: string | string[]): boolean => {
    if (question.type === 'multiple') {
      const correct = question.correct_answer as string[];
      const user = userAnswer as string[];
      if (correct.length !== user.length) return false;
      return correct.every((a) => user.includes(a)) && user.every((a) => correct.includes(a));
    }
    return question.correct_answer === userAnswer;
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`还有 ${unanswered.length} 道题未作答`);
      return;
    }

    setLoading(true);

    // Calculate results
    const newResults: QuizResults = {};
    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      if (userAnswer !== undefined) {
        newResults[question.id] = checkAnswer(question, userAnswer);
      }
    });

    setResults(newResults);
    setSubmitted(true);

    // Save answers to database if user is logged in
    if (userId) {
      try {
        const supabase = createClient();
        const answersToSave = questions.map((question) => ({
          user_id: userId,
          question_id: question.id,
          answer: answers[question.id],
          is_correct: newResults[question.id],
        }));

        const { error } = await supabase.from(DB.user_answers).upsert(answersToSave, {
          onConflict: 'user_id,question_id',
        });

        if (error) {
          logger.error('保存答案失败:', error);
          toast.error('保存答案失败，请重试');
        } else {
          // 保存成功后清除 localStorage
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        logger.error('保存答案失败:', error);
        toast.error('保存答案失败，请重试');
      }
    }

    setLoading(false);

    // Show result toast
    const correctCount = Object.values(newResults).filter(Boolean).length;
    const totalCount = questions.length;
    const percentage = Math.round((correctCount / totalCount) * 100);

    if (percentage === 100) {
      toast.success('太棒了！全部答对！+20 积分', { icon: '🎉' });
      // Award quiz perfect score points via Server Action (去重由 RPC 内部保证)
      if (userId) {
        await awardPointsAction('QUIZ_PERFECT', lessonId, 'lesson', '知识闯关全对');
      }
    } else if (percentage >= 60) {
      toast.success(`答对 ${correctCount}/${totalCount} 题，继续加油！`);
    } else {
      toast.error(`答对 ${correctCount}/${totalCount} 题，需要再复习一下`);
    }
  };

  // Phase 3: 使用确认对话框
  const handleReset = async () => {
    const confirmed = await confirm({
      title: '重新作答',
      description: '确定要重新作答吗？当前的答案将被清除。',
      confirmText: '重新作答',
      cancelText: '取消',
      variant: 'warning',
    });
    
    if (confirmed) {
      setAnswers({});
      setResults(null);
      setSubmitted(false);
      // 清除 localStorage
      localStorage.removeItem(storageKey);
    }
  };

  const correctCount = results
    ? Object.values(results).filter(Boolean).length
    : 0;
  const totalCount = questions.length;
  const percentage = results ? Math.round((correctCount / totalCount) * 100) : 0;

  // Phase 3: 改进空状态设计
  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
          <FileQuestion className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-1">本节课暂无测试题</p>
        <p className="text-sm text-muted-foreground/70">完成课程学习后再来挑战吧</p>
      </div>
    );
  }

  if (loadingHistory) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase 3: 答题进度指示器 */}
      {!submitted && totalQuestions > 0 && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Progress 
            value={answerProgress} 
            className="flex-1"
            label={`答题进度 ${answeredCount}/${totalQuestions}`}
          />
          <span className="shrink-0">
            已答 {answeredCount}/{totalQuestions} 题
          </span>
        </div>
      )}
      
      {/* 确认对话框 */}
      {ConfirmDialogComponent}
      
      {/* Results Header */}
      {submitted && results && (
        <m.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={`p-4 border ${percentage >= 60 ? 'bg-muted/50 border-border' : 'bg-muted/50 border-border'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {percentage >= 60 ? (
                  <Trophy className="w-5 h-5 text-foreground" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="font-medium">
                  {percentage >= 60 ? '测试通过' : '需要复习'}
                </span>
              </div>
              <span className="text-lg font-semibold">
                {correctCount}/{totalCount} 正确
              </span>
            </div>
            <Progress 
              value={percentage} 
              label={`正确率 ${percentage}%`}
            />
            <p className="text-sm text-muted-foreground mt-2">
              正确率: {percentage}%
            </p>
          </Card>
        </m.div>
      )}

      {/* Questions - Phase 3: 优化动画延迟（限制最大 500ms） */}
      <div className="space-y-6" role="list" aria-label="测试题目">
        {questions.map((question, index) => (
          <m.div
            key={question.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.2 }}
            role="listitem"
          >
            <QuizQuestion
              question={question}
              index={index}
              selectedAnswer={answers[question.id]}
              onAnswerChange={(answer) => handleAnswerChange(question.id, answer)}
              showResult={submitted}
              isCorrect={results?.[question.id]}
              disabled={submitted}
            />
          </m.div>
        ))}
      </div>

      {/* Submit/Reset Button - Phase 3: 动态按钮状态 */}
      <div className="flex gap-3">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={loading || unansweredCount > 0}
            className="flex-1 h-11"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                提交中...
              </>
            ) : unansweredCount > 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                还有 {unansweredCount} 题未答
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                提交答案
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 h-11"
          >
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            重新作答
          </Button>
        )}
      </div>
    </div>
  );
}
