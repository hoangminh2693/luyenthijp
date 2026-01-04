/**
 * Component cho phép người dùng chọn số lượng câu hỏi muốn làm
 */
import { cn } from '@/lib/utils';

interface QuestionCountSelectorProps {
  counts: number[];
  selectedCount: number;
  maxAvailable: number;
  onSelect: (count: number) => void;
}

export function QuestionCountSelector({
  counts,
  selectedCount,
  maxAvailable,
  onSelect,
}: QuestionCountSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        Số lượng câu hỏi
      </h3>
      <div className="flex flex-wrap gap-2">
        {counts.map((count) => {
          const isDisabled = count > maxAvailable;
          const isSelected = count === selectedCount;
          
          return (
            <button
              key={count}
              onClick={() => !isDisabled && onSelect(count)}
              disabled={isDisabled}
              className={cn(
                'flex h-12 min-w-[70px] items-center justify-center rounded-lg border-2 px-4 font-medium transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isDisabled
                  ? 'cursor-not-allowed border-border bg-muted/50 text-muted-foreground opacity-50'
                  : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              {count} câu
            </button>
          );
        })}
      </div>
      {maxAvailable < Math.max(...counts) && (
        <p className="text-xs text-muted-foreground">
          * Phần này chỉ có {maxAvailable} câu hỏi khả dụng
        </p>
      )}
    </div>
  );
}
