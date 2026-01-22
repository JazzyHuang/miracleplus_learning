'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Circle, Square, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Question, QuestionOption } from '@/types/database';

interface QuizQuestionProps {
  question: Question;
  index: number;
  selectedAnswer?: string | string[];
  onAnswerChange: (answer: string | string[]) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

export function QuizQuestion({
  question,
  index,
  selectedAnswer,
  onAnswerChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: QuizQuestionProps) {
  const getTypeLabel = () => {
    switch (question.type) {
      case 'single':
        return '单选题';
      case 'multiple':
        return '多选题';
      case 'boolean':
        return '判断题';
      default:
        return '';
    }
  };

  const handleOptionClick = (optionId: string) => {
    if (disabled) return;

    if (question.type === 'multiple') {
      const currentAnswers = (selectedAnswer as string[]) || [];
      if (currentAnswers.includes(optionId)) {
        onAnswerChange(currentAnswers.filter((a) => a !== optionId));
      } else {
        onAnswerChange([...currentAnswers, optionId]);
      }
    } else {
      onAnswerChange(optionId);
    }
  };

  const isOptionSelected = (optionId: string) => {
    if (question.type === 'multiple') {
      return (selectedAnswer as string[])?.includes(optionId);
    }
    return selectedAnswer === optionId;
  };

  const isOptionCorrect = (optionId: string) => {
    if (question.type === 'multiple') {
      return (question.correct_answer as string[]).includes(optionId);
    }
    return question.correct_answer === optionId;
  };

  const getOptionStyle = (optionId: string) => {
    const selected = isOptionSelected(optionId);
    const correct = isOptionCorrect(optionId);

    if (showResult) {
      if (correct) {
        return 'border-foreground bg-foreground/5 text-foreground';
      }
      if (selected && !correct) {
        return 'border-muted-foreground/50 bg-muted/50 text-muted-foreground';
      }
    }

    if (selected) {
      return 'border-foreground bg-foreground/5 text-foreground';
    }

    return 'border-border hover:border-foreground/30 hover:bg-muted/50';
  };

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm font-medium text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {getTypeLabel()}
            </Badge>
            {showResult && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, duration: 0.2 }}
              >
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-foreground" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </motion.div>
            )}
          </div>
          <p className="font-medium text-foreground">{question.question_text}</p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 ml-11">
        {question.options.map((option: QuestionOption) => (
          <motion.button
            key={option.id}
            whileHover={!disabled ? { scale: 1.005 } : {}}
            whileTap={!disabled ? { scale: 0.995 } : {}}
            transition={{ duration: 0.1 }}
            onClick={() => handleOptionClick(option.id)}
            disabled={disabled}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 text-left',
              getOptionStyle(option.id),
              disabled && 'cursor-default'
            )}
          >
            {/* Option Indicator */}
            <div className="flex-shrink-0">
              {question.type === 'multiple' ? (
                <div
                  className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center transition-colors duration-150',
                    isOptionSelected(option.id)
                      ? 'bg-foreground border-foreground'
                      : 'border-border'
                  )}
                >
                  {isOptionSelected(option.id) && (
                    <Check className="w-3 h-3 text-background" />
                  )}
                </div>
              ) : (
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-150',
                    isOptionSelected(option.id)
                      ? 'border-foreground'
                      : 'border-border'
                  )}
                >
                  {isOptionSelected(option.id) && (
                    <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
                  )}
                </div>
              )}
            </div>

            {/* Option Text */}
            <span className="flex-1">{option.text}</span>

            {/* Result Indicator */}
            {showResult && (
              <div className="flex-shrink-0">
                {isOptionCorrect(option.id) && (
                  <CheckCircle2 className="w-5 h-5 text-foreground" />
                )}
                {isOptionSelected(option.id) && !isOptionCorrect(option.id) && (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Explanation */}
      {showResult && question.explanation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="ml-11"
        >
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">解析：</span>
              {question.explanation}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
