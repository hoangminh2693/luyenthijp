/**
 * Component hiển thị danh sách đề nghe cho phần 聴解
 * Cho phép người dùng chọn đề cụ thể thay vì random
 */
import { Headphones, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ListeningExam } from '@/hooks/useQuestions';

interface ListeningExamSelectorProps {
  exams: ListeningExam[];
  completedExamIndices: Set<number>;
  isLoggedIn: boolean;
  onSelectExam: (examIndex: number) => void;
  className?: string;
}

export function ListeningExamSelector({
  exams,
  completedExamIndices,
  isLoggedIn,
  onSelectExam,
  className,
}: ListeningExamSelectorProps) {
  if (exams.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Headphones className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Chưa có đề nghe nào.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-medium text-foreground">
        Chọn đề nghe ({exams.length} đề)
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {exams.map((exam, index) => {
          const isCompleted = completedExamIndices.has(index);
          return (
            <button
              key={exam.audioUrl}
              onClick={() => onSelectExam(index)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                "hover:shadow-md hover:border-primary hover:bg-primary/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isCompleted
                  ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30"
                  : "border-border bg-card"
              )}
            >
              {/* Status badge */}
              {isLoggedIn && (
                <div className="absolute top-2 right-2">
                  {isCompleted ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                      Đã làm
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50">
                      <Sparkles className="h-3 w-3 mr-0.5" />
                      Mới
                    </Badge>
                  )}
                </div>
              )}

              {/* Icon */}
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                isCompleted
                  ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                  : "bg-primary/10 text-primary"
              )}>
                <Headphones className="h-5 w-5" />
              </div>

              {/* Label */}
              <span className="text-sm font-semibold text-foreground">
                Đề {index + 1}
              </span>

              {/* Question count */}
              <span className="text-xs text-muted-foreground">
                {exam.questionCount} câu
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
