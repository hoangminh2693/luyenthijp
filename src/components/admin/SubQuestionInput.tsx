/**
 * SubQuestionInput - Component nhập câu hỏi con (sub-questions)
 * Dùng cho đề bài có nhiều câu hỏi nhỏ
 * Hỗ trợ paste từ Excel/Sheets
 */
import { useCallback, useState } from 'react';
import { Plus, Trash2, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditable } from '@/components/admin/RichTextEditable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SubQuestion {
  id?: string;
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

/**
 * Loại bỏ số thứ tự ở đầu câu hỏi (ví dụ: "1. Câu hỏi", "2) Nội dung")
 */
function removeQuestionNumber(text: string): string {
  return text.replace(/^\s*\d+\s*[.\-):]\s*/, '');
}

export function SubQuestionInput({ subQuestions, onChange, disabled }: SubQuestionInputProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

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

  // Xử lý paste từ Excel/Sheets
  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;

    const lines = pasteText.trim().split('\n');
    const parsed: SubQuestion[] = [];

    lines.forEach((line) => {
      const values = line.includes('\t') ? line.split('\t') : line.split(',');

      if (values.length >= 5) {
        let correctOption = values[5]?.trim().toUpperCase() || '';
        if (correctOption.startsWith('OPTION_')) {
          correctOption = correctOption.replace('OPTION_', '');
        }

        parsed.push({
          content: removeQuestionNumber(values[0]?.trim() || ''),
          option_a: values[1]?.trim() || '',
          option_b: values[2]?.trim() || '',
          option_c: values[3]?.trim() || '',
          option_d: values[4]?.trim() || '',
          correct_option: ['A', 'B', 'C', 'D'].includes(correctOption) ? correctOption : '',
          explanation: values[6]?.trim() || '',
        });
      }
    });

    if (parsed.length > 0) {
      onChange([...subQuestions, ...parsed]);
      setPasteMode(false);
      setPasteText('');
    }
  }, [pasteText, subQuestions, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-medium text-foreground">Câu hỏi con</h4>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPasteMode(!pasteMode)}
            disabled={disabled}
            className="gap-1"
          >
            <Copy className="h-4 w-4" />
            Paste từ Excel
          </Button>
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
      </div>

      {pasteMode && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste dữ liệu từ Excel/Sheets. Mỗi dòng 1 câu hỏi, các cột: Nội dung | A | B | C | D | Đáp án đúng | Giải thích
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste dữ liệu vào đây..."
            className="min-h-[100px] font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePaste}
              disabled={!pasteText.trim()}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              Xác nhận
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPasteMode(false);
                setPasteText('');
              }}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Hủy
            </Button>
          </div>
        </div>
      )}

      {subQuestions.length === 0 && !pasteMode && (
        <p className="text-sm text-muted-foreground italic">
          Chưa có câu hỏi con. Bấm "Thêm câu con" hoặc "Paste từ Excel" để thêm.
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