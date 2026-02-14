/**
 * SubQuestionInput - Component nhập câu hỏi con (sub-questions)
 * Dùng cho đề bài có nhiều câu hỏi nhỏ
 * Hỗ trợ paste từ Excel/Sheets
 * Hỗ trợ các loại câu hỏi nghe (audio_only, image_based)
 */
import { useCallback, useState } from 'react';
import { Plus, Trash2, Copy, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
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

// Loại câu hỏi nghe theo format JLPT
type ListeningQuestionType = 'standard' | 'audio_only' | 'image_based';

export interface SubQuestion {
  id?: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  question_type?: ListeningQuestionType;
  option_count?: number;
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
  question_type: 'standard',
  option_count: 4,
};

/**
 * Loại bỏ số thứ tự ở đầu câu hỏi (ví dụ: "1. Câu hỏi", "2) Nội dung")
 */
function removeQuestionNumber(text: string): string {
  return text.replace(/^\s*\d+\s*[.\-):]\s*/, '');
}

/**
 * Chuyển đổi các ký hiệu markup thành HTML:
 * - [br] → <br>
 * - [b]nội dung[/b] → <b>nội dung</b>
 * - [u]nội dung[/u] → <u>nội dung</u>
 * - [i]nội dung[/i] → <i>nội dung</i>
 */
function convertMarkupToHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[br\]/gi, '<br>')
    .replace(/\[b\](.*?)\[\/b\]/gi, '<b>$1</b>')
    .replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>')
    .replace(/\[i\](.*?)\[\/i\]/gi, '<i>$1</i>');
}

/**
 * Áp dụng chuyển đổi markup cho text sau khi xử lý số thứ tự
 */
function processText(text: string): string {
  return convertMarkupToHtml(removeQuestionNumber(text?.trim() || ''));
}

/** Strip HTML tags for preview text */
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function SubQuestionInput({ subQuestions, onChange, disabled }: SubQuestionInputProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());

  const toggleExpand = useCallback((index: number) => {
    setExpandedIndexes(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const addSubQuestion = useCallback(() => {
    onChange([...subQuestions, { ...emptySubQuestion }]);
  }, [subQuestions, onChange]);

  const removeSubQuestion = useCallback((index: number) => {
    onChange(subQuestions.filter((_, i) => i !== index));
  }, [subQuestions, onChange]);

  const updateSubQuestion = useCallback((index: number, field: keyof SubQuestion, value: string | number) => {
    const updated = [...subQuestions];
    // Handle option_count specially - convert string to number
    if (field === 'option_count') {
      updated[index] = { ...updated[index], [field]: typeof value === 'string' ? parseInt(value, 10) : value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
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
          content: processText(values[0] || ''),
          option_a: convertMarkupToHtml(values[1]?.trim() || ''),
          option_b: convertMarkupToHtml(values[2]?.trim() || ''),
          option_c: convertMarkupToHtml(values[3]?.trim() || ''),
          option_d: convertMarkupToHtml(values[4]?.trim() || ''),
          correct_option: ['A', 'B', 'C', 'D'].includes(correctOption) ? correctOption : '',
          explanation: convertMarkupToHtml(values[6]?.trim() || ''),
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
            className="rounded-lg border border-border bg-muted/20 overflow-hidden"
          >
            {/* Collapsible header */}
            <div
              className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => toggleExpand(index)}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {expandedIndexes.has(index) ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-muted-foreground shrink-0">
                  Câu {index + 1}
                </span>
                {!expandedIndexes.has(index) && (
                  <span className="text-xs text-muted-foreground truncate">
                    {stripHtml(sq.content) || '(chưa có nội dung)'}
                    {sq.correct_option && ` • Đáp án: ${sq.correct_option}`}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); removeSubQuestion(index); }}
                disabled={disabled}
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {expandedIndexes.has(index) && (
              <div className="px-4 pb-3 space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Nội dung câu hỏi</label>
                  <RichTextEditable
                    value={sq.content}
                    placeholder={sq.question_type === 'audio_only' ? '(Để trống nếu trong audio)' : 'Nội dung câu hỏi con...'}
                    onChange={(v) => updateSubQuestion(index, 'content', v)}
                    compact
                    showToolbar={false}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Loại câu hỏi</label>
                    <Select
                      value={sq.question_type || 'standard'}
                      onValueChange={(v) => updateSubQuestion(index, 'question_type', v)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="audio_only">Audio Only</SelectItem>
                        <SelectItem value="image_based">Image Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Số đáp án</label>
                    <Select
                      value={String(sq.option_count || 4)}
                      onValueChange={(v) => updateSubQuestion(index, 'option_count', v)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 đáp án</SelectItem>
                        <SelectItem value="3">3 đáp án</SelectItem>
                        <SelectItem value="4">4 đáp án</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Đáp án A (①)</label>
                    <RichTextEditable
                      value={sq.option_a}
                      placeholder={sq.question_type === 'audio_only' ? '—' : 'A'}
                      onChange={(v) => updateSubQuestion(index, 'option_a', v)}
                      compact
                      showToolbar={false}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Đáp án B (②)</label>
                    <RichTextEditable
                      value={sq.option_b}
                      placeholder={sq.question_type === 'audio_only' ? '—' : 'B'}
                      onChange={(v) => updateSubQuestion(index, 'option_b', v)}
                      compact
                      showToolbar={false}
                    />
                  </div>
                  {(sq.option_count ?? 4) >= 3 && (
                    <div>
                      <label className="text-xs text-muted-foreground">Đáp án C (③)</label>
                      <RichTextEditable
                        value={sq.option_c}
                        placeholder={sq.question_type === 'audio_only' ? '—' : 'C'}
                        onChange={(v) => updateSubQuestion(index, 'option_c', v)}
                        compact
                        showToolbar={false}
                      />
                    </div>
                  )}
                  {(sq.option_count ?? 4) >= 4 && (
                    <div>
                      <label className="text-xs text-muted-foreground">Đáp án D (④)</label>
                      <RichTextEditable
                        value={sq.option_d}
                        placeholder={sq.question_type === 'audio_only' ? '—' : 'D'}
                        onChange={(v) => updateSubQuestion(index, 'option_d', v)}
                        compact
                        showToolbar={false}
                      />
                    </div>
                  )}
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
                        <SelectItem value="A">① A</SelectItem>
                        <SelectItem value="B">② B</SelectItem>
                        {(sq.option_count ?? 4) >= 3 && (
                          <SelectItem value="C">③ C</SelectItem>
                        )}
                        {(sq.option_count ?? 4) >= 4 && (
                          <SelectItem value="D">④ D</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-[2]">
                    <label className="text-xs text-muted-foreground">Giải thích</label>
                    <RichTextEditable
                      value={sq.explanation}
                      placeholder="Giải thích (tùy chọn)"
                      onChange={(v) => updateSubQuestion(index, 'explanation', v)}
                      compact
                      showToolbar={false}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}