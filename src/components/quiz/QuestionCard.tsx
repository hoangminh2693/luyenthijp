import { Check, X } from 'lucide-react';
import type { Question } from '@/data/quizData';
import { cn } from '@/lib/utils';

/**
 * QuestionCard Component - Hiển thị một câu hỏi trắc nghiệm
 */
interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  showResult?: boolean;
  isSubmitted?: boolean;
}

export function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
  isSubmitted = false,
}: QuestionCardProps) {
  const options = ['A', 'B', 'C', 'D'] as const;

  const getOptionStyle = (option: string) => {
    if (!showResult) {
      // Chế độ làm bài - chỉ highlight đáp án đã chọn
      return selectedAnswer === option
        ? 'border-primary bg-primary/10 text-foreground'
        : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5';
    }

    // Chế độ xem kết quả
    const isCorrect = option === question.correctOption;
    const isSelected = option === selectedAnswer;

    if (isCorrect) {
      return 'border-success bg-success-light text-success';
    }
    if (isSelected && !isCorrect) {
      return 'border-error bg-error-light text-error';
    }
    return 'border-border bg-card opacity-60';
  };

  return (
    <div 
      className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in-up"
      style={{ animationDelay: `${questionNumber * 0.05}s` }}
    >
      {/* Question header */}
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {questionNumber}
        </span>
        <p className="text-base font-medium text-foreground leading-relaxed">
          {question.content}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 pl-11">
        {options.map((option) => {
          const isCorrect = option === question.correctOption;
          const isSelected = option === selectedAnswer;

          return (
            <button
              key={option}
              onClick={() => !isSubmitted && onSelectAnswer(option)}
              disabled={isSubmitted}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all duration-200',
                getOptionStyle(option),
                !isSubmitted && 'cursor-pointer',
                isSubmitted && 'cursor-default'
              )}
            >
              {/* Option letter */}
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                  showResult && isCorrect
                    ? 'border-success bg-success text-success-foreground'
                    : showResult && isSelected && !isCorrect
                    ? 'border-error bg-error text-error-foreground'
                    : selectedAnswer === option
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background'
                )}
              >
                {showResult && isCorrect ? (
                  <Check className="h-4 w-4" />
                ) : showResult && isSelected && !isCorrect ? (
                  <X className="h-4 w-4" />
                ) : (
                  option
                )}
              </span>

              {/* Option text */}
              <span className="flex-1 text-sm">
                {question.options[option]}
              </span>

              {/* Result indicator */}
              {showResult && isCorrect && (
                <span className="text-xs font-medium text-success">
                  Đáp án đúng
                </span>
              )}
              {showResult && isSelected && !isCorrect && (
                <span className="text-xs font-medium text-error">
                  Đáp án sai
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
