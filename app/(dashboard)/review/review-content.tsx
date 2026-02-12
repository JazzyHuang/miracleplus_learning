'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Brain, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { createReviewService, type ReviewItem } from '@/lib/courses/review-service';
import { awardPointsAction } from '@/app/actions/points';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ReviewContentProps {
  userId: string;
}

export default function ReviewContent({ userId }: ReviewContentProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const service = createReviewService(supabase);
      const items = await service.getDueReviews(userId, 20);
      setReviews(items);
      setLoading(false);
    };
    load();
  }, [userId]);

  const current = reviews[currentIndex];

  const handleAnswer = (answer: string) => {
    if (showAnswer) return;
    setSelectedAnswer(answer);
    setShowAnswer(true);
  };

  const isCorrect = useCallback(() => {
    if (!current || !selectedAnswer) return false;
    if (current.question.type === 'multiple') {
      const correct = current.question.correctAnswer as string[];
      const selected = selectedAnswer as string[];
      return correct.length === selected.length && correct.every(a => selected.includes(a));
    }
    return current.question.correctAnswer === selectedAnswer;
  }, [current, selectedAnswer]);

  const handleNext = async (quality: number) => {
    if (!current) return;
    const supabase = createClient();
    const service = createReviewService(supabase);
    await service.updateReview(current.id, quality);

    setCompleted(prev => prev + 1);
    setShowAnswer(false);
    setSelectedAnswer(null);

    if (currentIndex < reviews.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('复习完成！+15 积分');
      await awardPointsAction('DAILY_REVIEW', 'review', 'review', '每日复习');
      setReviews([]);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (reviews.length === 0 && completed === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <Brain className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">暂无待复习题目</h1>
        <p className="text-muted-foreground">完成课程测验后，答错的题目会自动加入复习计划</p>
      </div>
    );
  }

  if (reviews.length === 0 && completed > 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <Sparkles className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">今日复习完成！</h1>
        <p className="text-muted-foreground">已复习 {completed} 道题，获得 15 积分</p>
      </div>
    );
  }

  const progress = reviews.length > 0 ? ((currentIndex) / reviews.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          每日复习
        </h1>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {reviews.length}
        </span>
      </div>

      <Progress value={progress} className="mb-6" />

      {current && (
        <Card className="p-6 space-y-6">
          <p className="text-lg font-medium">{current.question.questionText}</p>

          <div className="space-y-3">
            {(current.question.options as string[]).map((option, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selectedAnswer === letter;
              const isCorrectOpt = showAnswer && (
                current.question.type === 'multiple'
                  ? (current.question.correctAnswer as string[]).includes(letter)
                  : current.question.correctAnswer === letter
              );
              const isWrong = showAnswer && isSelected && !isCorrectOpt;

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(letter)}
                  disabled={showAnswer}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border transition-colors',
                    !showAnswer && 'hover:bg-accent cursor-pointer',
                    !showAnswer && isSelected && 'border-primary bg-primary/5',
                    isCorrectOpt && 'border-success bg-success/10',
                    isWrong && 'border-destructive bg-destructive/10',
                    showAnswer && !isCorrectOpt && !isWrong && 'opacity-50'
                  )}
                >
                  <span className="font-medium mr-2">{letter}.</span>
                  {option}
                  {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-success inline ml-2" />}
                  {isWrong && <XCircle className="w-4 h-4 text-destructive inline ml-2" />}
                </button>
              );
            })}
          </div>

          {showAnswer && current.question.explanation && (
            <div className="p-4 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">解析</p>
              <p className="text-muted-foreground">{current.question.explanation}</p>
            </div>
          )}

          {showAnswer && (
            <div className="flex gap-3">
              {isCorrect() ? (
                <>
                  <Button onClick={() => handleNext(4)} className="flex-1">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    记住了
                  </Button>
                  <Button onClick={() => handleNext(5)} variant="outline" className="flex-1">
                    很简单
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => handleNext(1)} variant="destructive" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    再复习
                  </Button>
                  <Button onClick={() => handleNext(3)} variant="outline" className="flex-1">
                    勉强记得
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
