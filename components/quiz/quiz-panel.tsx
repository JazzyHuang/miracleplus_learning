'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, RefreshCw, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { QuizQuestion } from './quiz-question';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

export function QuizPanel({ lessonId, questions, userId }: QuizPanelProps) {
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [results, setResults] = useState<QuizResults | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
      newResults[question.id] = checkAnswer(question, answers[question.id]);
    });

    setResults(newResults);
    setSubmitted(true);

    // Save answers to database if user is logged in
    if (userId) {
      const supabase = createClient();
      const answersToSave = questions.map((question) => ({
        user_id: userId,
        question_id: question.id,
        answer: answers[question.id],
        is_correct: newResults[question.id],
      }));

      await supabase.from('user_answers').upsert(answersToSave, {
        onConflict: 'user_id,question_id',
      });
    }

    setLoading(false);

    // Show result toast
    const correctCount = Object.values(newResults).filter(Boolean).length;
    const totalCount = questions.length;
    const percentage = Math.round((correctCount / totalCount) * 100);

    if (percentage === 100) {
      toast.success('太棒了！全部答对！', { icon: '🎉' });
    } else if (percentage >= 60) {
      toast.success(`答对 ${correctCount}/${totalCount} 题，继续加油！`);
    } else {
      toast.error(`答对 ${correctCount}/${totalCount} 题，需要再复习一下`);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setResults(null);
    setSubmitted(false);
  };

  const correctCount = results
    ? Object.values(results).filter(Boolean).length
    : 0;
  const totalCount = questions.length;
  const percentage = results ? Math.round((correctCount / totalCount) * 100) : 0;

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>本节课暂无测试题</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      {submitted && results && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={`p-4 border ${percentage >= 60 ? 'bg-muted/50 border-border' : 'bg-muted/50 border-border'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {percentage >= 60 ? (
                  <Trophy className="w-5 h-5 text-foreground" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {percentage >= 60 ? '测试通过' : '需要复习'}
                </span>
              </div>
              <span className="text-lg font-semibold">
                {correctCount}/{totalCount} 正确
              </span>
            </div>
            <Progress value={percentage} />
            <p className="text-sm text-muted-foreground mt-2">
              正确率: {percentage}%
            </p>
          </Card>
        </motion.div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
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
          </motion.div>
        ))}
      </div>

      {/* Submit/Reset Button */}
      <div className="flex gap-3">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-11"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            提交答案
          </Button>
        ) : (
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 h-11"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重新作答
          </Button>
        )}
      </div>
    </div>
  );
}
