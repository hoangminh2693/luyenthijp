import { cn } from '@/lib/utils';

/**
 * QuizProgress Component - Hiển thị tiến độ làm bài
 */
interface QuizProgressProps {
  totalQuestions: number;
  answeredQuestions: number;
  currentQuestion?: number;
  onQuestionClick?: (index: number) => void;
  answers?: Record<string, string>;
  questionIds?: string[];
}

export function QuizProgress({
  totalQuestions,
  answeredQuestions,
  currentQuestion,
  onQuestionClick,
  answers = {},
  questionIds = [],
}: QuizProgressProps) {
  const percentage = Math.round((answeredQuestions / totalQuestions) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      {/* Progress bar */}
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Tiến độ làm bài</span>
        <span className="text-muted-foreground">
          {answeredQuestions}/{totalQuestions} câu ({percentage}%)
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Question navigation dots */}
      {questionIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {questionIds.map((id, index) => {
            const isAnswered = !!answers[id];
            const isCurrent = currentQuestion === index;

            return (
              <button
                key={id}
                onClick={() => onQuestionClick?.(index)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all',
                  isAnswered
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
                  isCurrent && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
