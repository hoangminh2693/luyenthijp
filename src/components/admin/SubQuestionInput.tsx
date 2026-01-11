/**
 * SubQuestionInput - Component nhập câu hỏi con (sub-questions)
 * Dùng cho đề bài có nhiều câu hỏi nhỏ
 */
import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextEditable } from '@/components/admin/RichTextEditable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SubQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
}

interface SubQuestionInputProps {
  subQuestions: SubQuestion[];
  onChange: (subQuestions: SubQuestion[]) => void;
  disabled?: boolean;
}

const emptySubQuestion: SubQuestion = {
  content: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: '',
  explanation: '',
};

export function SubQuestionInput({ subQuestions, onChange, disabled }: SubQuestionInputProps) {
  const addSubQuestion = useCallback(() => {
    onChange([...subQuestions, { ...emptySubQuestion }]);
  }, [subQuestions, onChange]);

  const removeSubQuestion = useCallback((index: number) => {
    onChange(subQuestions.filter((_, i) => i !== index));
  }, [subQuestions, onChange]);

  const updateSubQuestion = useCallback((index: number, field: keyof SubQuestion, value: string) => {
    const updated = [...subQuestions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }, [subQuestions, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">Câu hỏi con</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSubQuestion}
          disabled={disabled}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Thêm câu con
        </Button>
      </div>

      {subQuestions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Chưa có câu hỏi con. Bấm "Thêm câu con" để thêm.
        </p>
      )}

      <div className="space-y-4">
        {subQuestions.map((sq, index) => (
          <div 
            key={index} 
            className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Câu {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSubQuestion(index)}
                disabled={disabled}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Nội dung câu hỏi</label>
              <RichTextEditable
                value={sq.content}
                placeholder="Nội dung câu hỏi con..."
                onChange={(v) => updateSubQuestion(index, 'content', v)}
                className="min-h-[48px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Đáp án A</label>
                <RichTextEditable
                  value={sq.option_a}
                  placeholder="A"
                  onChange={(v) => updateSubQuestion(index, 'option_a', v)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Đáp án B</label>
                <RichTextEditable
                  value={sq.option_b}
                  placeholder="B"
                  onChange={(v) => updateSubQuestion(index, 'option_b', v)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Đáp án C</label>
                <RichTextEditable
                  value={sq.option_c}
                  placeholder="C"
                  onChange={(v) => updateSubQuestion(index, 'option_c', v)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Đáp án D</label>
                <RichTextEditable
                  value={sq.option_d}
                  placeholder="D"
                  onChange={(v) => updateSubQuestion(index, 'option_d', v)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Đáp án đúng</label>
                <Select 
                  value={sq.correct_option} 
                  onValueChange={(v) => updateSubQuestion(index, 'correct_option', v)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-[2]">
                <label className="text-xs text-muted-foreground">Giải thích</label>
                <RichTextEditable
                  value={sq.explanation}
                  placeholder="Giải thích (tùy chọn)"
                  onChange={(v) => updateSubQuestion(index, 'explanation', v)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
