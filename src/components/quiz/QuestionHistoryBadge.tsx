/**
 * Badge hiển thị số lần đã làm câu hỏi trong quá khứ
 */
import { History, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionHistoryBadgeProps {
  totalAttempts: number;
  correctCount: number;
  className?: string;
}

export function QuestionHistoryBadge({
  totalAttempts,
  correctCount,
  className,
}: QuestionHistoryBadgeProps) {
  if (totalAttempts === 0) return null;

  const incorrectCount = totalAttempts - correctCount;
  const correctRate = Math.round((correctCount / totalAttempts) * 100);

  return (
    <div 
      className={cn(
        'flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs',
        className
      )}
      title={`Bạn đã gặp câu này ${totalAttempts} lần (${correctRate}% đúng)`}
    >
      <History className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">
        Đã làm {totalAttempts} lần
      </span>
      <div className="flex items-center gap-1">
        <span className="flex items-center gap-0.5 text-success">
          <Check className="h-3 w-3" />
          {correctCount}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="flex items-center gap-0.5 text-error">
          <X className="h-3 w-3" />
          {incorrectCount}
        </span>
      </div>
    </div>
  );
}
