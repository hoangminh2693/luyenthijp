/**
 * Component hiển thị thông tin đề nghe cho phần 聴解
 * Thay thế QuestionCountSelector cho các section có fixed_exam_mode = true
 */
import { Headphones, Clock, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListeningExamSelectorProps {
  totalExams: number;
  estimatedMinutes: number;
  className?: string;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  if (minutes < 1) return '< 1 phút';
  return `~${Math.ceil(minutes)} phút`;
}

export function ListeningExamSelector({
  totalExams,
  estimatedMinutes,
  className,
}: ListeningExamSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-medium text-foreground">
        Chế độ làm bài
      </h3>
      
      {/* Info card cho phần nghe */}
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Headphones className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-foreground">
              Làm 1 đề nghe hoàn chỉnh
            </h4>
            <p className="text-sm text-muted-foreground">
              Hệ thống sẽ chọn ngẫu nhiên 1 đề nghe từ kho {totalExams} đề. 
              Bạn sẽ nghe audio và trả lời tất cả câu hỏi liên quan.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Số đề đang có</p>
            <p className="font-semibold text-foreground">{totalExams} đề</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Thời gian ước tính</p>
            <p className="font-semibold text-foreground">{formatDuration(estimatedMinutes)}</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
        <AlertCircle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
        <p className="text-xs text-foreground/80">
          <strong>Lưu ý:</strong> Phần nghe sẽ làm theo đề hoàn chỉnh, không thể chọn số lượng câu hỏi 
          vì các câu hỏi phụ thuộc vào cùng một đoạn audio.
        </p>
      </div>
    </div>
  );
}
