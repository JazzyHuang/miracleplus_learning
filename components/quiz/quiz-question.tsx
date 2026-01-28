'use client';

import { memo, useCallback } from 'react';
import { m } from 'framer-motion';
import { CheckCircle2, XCircle, Check } from 'lucide-react';
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

/**
 * Quiz 问题组件
 * 
 * Phase 3 改进：
 * 1. 使用 memo 优化重渲染
 * 2. 添加 ARIA 属性提升可访问性
 * 3. 添加键盘事件处理
 */
export const QuizQuestion = memo(function QuizQuestion({
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

  const handleOptionClick = useCallback((optionId: string) => {
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
  }, [disabled, question.type, selectedAnswer, onAnswerChange]);

  // Phase 3: 键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent, optionId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOptionClick(optionId);
    }
  }, [handleOptionClick]);

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

  // Phase 3: 添加 ARIA 角色
  const groupRole = question.type === 'multiple' ? 'group' : 'radiogroup';
  const optionRole = question.type === 'multiple' ? 'checkbox' : 'radio';

  return (
    <div className="space-y-4" role="article" aria-labelledby={`question-${question.id}`}>
      {/* Question Header */}
      <div className="flex items-start gap-3">
        <span 
          className="shrink-0 w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm font-medium text-muted-foreground"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {getTypeLabel()}
            </Badge>
            {showResult && (
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, duration: 0.2 }}
                aria-label={isCorrect ? '回答正确' : '回答错误'}
              >
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-foreground" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                )}
              </m.div>
            )}
          </div>
          <p id={`question-${question.id}`} className="font-medium text-foreground">
            第 {index + 1} 题：{question.question_text}
          </p>
        </div>
      </div>

      {/* Options - Phase 3: 添加 ARIA 属性 */}
      <div 
        className="space-y-2 ml-11" 
        role={groupRole}
        aria-labelledby={`question-${question.id}`}
      >
        {question.options.map((option: QuestionOption) => (
          <m.button
            key={option.id}
            whileHover={!disabled ? { scale: 1.005 } : {}}
            whileTap={!disabled ? { scale: 0.995 } : {}}
            transition={{ duration: 0.1 }}
            onClick={() => handleOptionClick(option.id)}
            onKeyDown={(e) => handleKeyDown(e, option.id)}
            disabled={disabled}
            role={optionRole}
            aria-checked={isOptionSelected(option.id)}
            aria-invalid={showResult && isOptionSelected(option.id) && !isOptionCorrect(option.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left',
              getOptionStyle(option.id),
              disabled && 'cursor-default'
            )}
          >
            {/* Option Indicator */}
            <div className="shrink-0" aria-hidden="true">
              {question.type === 'multiple' ? (
                <div
                  className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center transition-colors duration-200',
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
                    'w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200',
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
              <div className="shrink-0" aria-hidden="true">
                {isOptionCorrect(option.id) && (
                  <CheckCircle2 className="w-5 h-5 text-foreground" />
                )}
                {isOptionSelected(option.id) && !isOptionCorrect(option.id) && (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            )}
          </m.button>
        ))}
      </div>

      {/* Explanation */}
      {showResult && question.explanation && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="ml-11"
          role="note"
          aria-label="题目解析"
        >
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">解析：</span>
              {question.explanation}
            </p>
          </div>
        </m.div>
      )}
    </div>
  );
});
