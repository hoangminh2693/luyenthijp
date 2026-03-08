import { Award, CheckCircle, XCircle, RotateCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ActivityWidget } from '@/components/ui/ActivityWidget';
import { ShareableResultCard } from '@/components/quiz/ShareableResultCard';
import type { QuizResult } from '@/data/quizData';
import { cn } from '@/lib/utils';

/**
 * ResultSummary Component - Hiển thị tổng kết kết quả làm bài
 */
interface ResultSummaryProps {
  result: QuizResult;
  examName: string;
  onRetry: () => void;
}

export function ResultSummary({ result, examName, onRetry }: ResultSummaryProps) {
  const { totalQuestions, correctAnswers, wrongAnswers, percentage } = result;

  // Xác định trạng thái kết quả
  const getResultStatus = () => {
    if (percentage >= 80) return { label: 'Xuất sắc!', color: 'text-success', bg: 'bg-success/10' };
    if (percentage >= 60) return { label: 'Khá tốt!', color: 'text-primary', bg: 'bg-primary/10' };
    if (percentage >= 40) return { label: 'Cần cố gắng', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'Cần ôn luyện thêm', color: 'text-error', bg: 'bg-error/10' };
  };

  const status = getResultStatus();

  return (
    <div className="animate-scale-in rounded-2xl border border-border bg-card p-8 shadow-card-hover">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className={cn('mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full', status.bg)}>
          <Award className={cn('h-10 w-10', status.color)} />
        </div>
        <h2 className="mb-1 text-2xl font-bold text-foreground">Kết quả làm bài</h2>
        <p className="text-muted-foreground">{examName}</p>
      </div>

      {/* Score display */}
      <div className="mb-6 text-center">
        <div className={cn('mb-2 text-6xl font-bold', status.color)}>
          {percentage}%
        </div>
        <p className={cn('text-lg font-semibold', status.color)}>
          {status.label}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-secondary p-4 text-center">
          <div className="mb-1 text-2xl font-bold text-foreground">{totalQuestions}</div>
          <div className="text-xs text-muted-foreground">Tổng câu hỏi</div>
        </div>
        <div className="rounded-xl bg-success-light p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="text-2xl font-bold text-success">{correctAnswers}</span>
          </div>
          <div className="text-xs text-success">Câu đúng</div>
        </div>
        <div className="rounded-xl bg-error-light p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1">
            <XCircle className="h-5 w-5 text-error" />
            <span className="text-2xl font-bold text-error">{wrongAnswers}</span>
          </div>
          <div className="text-xs text-error">Câu sai</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onRetry} className="flex-1 gap-2" variant="outline">
          <RotateCcw className="h-4 w-4" />
          Làm lại
        </Button>
        <Button asChild className="flex-1 gap-2">
          <Link to="/subjects">
            <Home className="h-4 w-4" />
            Chọn đề khác
          </Link>
        </Button>
      </div>

      {/* Activity Widget - hiển thị ở trang kết quả */}
      <div className="mt-6 flex justify-center">
        <ActivityWidget variant="compact" />
      </div>
    </div>
  );
}
