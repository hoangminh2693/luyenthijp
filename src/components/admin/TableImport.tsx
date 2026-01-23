/**
 * TableImport - Component nhập câu hỏi trực tiếp bằng bảng
 * - Paste từ Word/Docs sẽ giữ in đậm / in nghiêng / gạch chân
 * - Có toolbar để tự bôi đen và bấm In đậm/In nghiêng/Gạch chân
 * - Hỗ trợ hình ảnh, âm thanh và câu hỏi con
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Image, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RichTextEditable } from '@/components/admin/RichTextEditable';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { SubQuestionInput, type SubQuestion } from '@/components/admin/SubQuestionInput';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface TableQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  image_url?: string;
  audio_url?: string;
  subQuestions?: SubQuestion[];
}

interface TableImportProps {
  onQuestionsChange: (questions: TableQuestion[]) => void;
}

const emptyQuestion: TableQuestion = {
  content: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: '',
  explanation: '',
  image_url: undefined,
  audio_url: undefined,
  subQuestions: [],
};

type ActiveCell = { index: number; field: keyof TableQuestion } | null;

/**
 * Loại bỏ số thứ tự ở đầu câu hỏi (ví dụ: "1. Câu hỏi", "2) Nội dung", "3- Text")
 * Chỉ loại bỏ khi số đứng đầu và theo sau bởi dấu phân cách (.  )  -  :)
 */
function removeQuestionNumber(text: string): string {
  return text.replace(/^\s*\d+\s*[.\-):]\s*/, '');
}

export function TableImport({ onQuestionsChange }: TableImportProps) {
  const [questions, setQuestions] = useState<TableQuestion[]>([{ ...emptyQuestion }]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const toggleRowExpanded = useCallback((index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const updateQuestion = useCallback(
    (index: number, field: keyof TableQuestion, value: string | SubQuestion[] | undefined) => {
      const updated = [...questions];
      updated[index] = { ...updated[index], [field]: value };
      setQuestions(updated);
      onQuestionsChange(updated);
    },
    [questions, onQuestionsChange]
  );

  const addRow = useCallback(() => {
    const updated = [...questions, { ...emptyQuestion }];
    setQuestions(updated);
    onQuestionsChange(updated);
  }, [questions, onQuestionsChange]);

  const removeRow = useCallback(
    (index: number) => {
      if (questions.length === 1) return;
      const updated = questions.filter((_, i) => i !== index);
      setQuestions(updated);
      onQuestionsChange(updated);
      setExpandedRows(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    },
    [questions, onQuestionsChange]
  );

  // Xử lý paste từ Excel/Sheets (text thuần)
  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;

    const lines = pasteText.trim().split('\n');
    const parsed: TableQuestion[] = [];

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
          image_url: undefined,
          audio_url: undefined,
          subQuestions: [],
        });
      }
    });

    if (parsed.length > 0) {
      setQuestions(parsed);
      onQuestionsChange(parsed);
      setPasteMode(false);
      setPasteText('');
    }
  }, [pasteText, onQuestionsChange]);

  const validQuestions = useMemo(
    () =>
      questions.filter(
        (q) => {
          if (!q.content) return false;
          const hasDirectAnswer = q.option_a && q.option_b && q.option_c && q.option_d && q.correct_option;
          // Có ít nhất 1 câu hỏi con hợp lệ
          const validSubQuestions = q.subQuestions?.filter(
            sq => sq.content && sq.option_a && sq.option_b && sq.option_c && sq.option_d && sq.correct_option
          ) || [];
          const hasValidSubQuestions = validSubQuestions.length > 0;
          return hasDirectAnswer || hasValidSubQuestions;
        }
      ),
    [questions]
  );

  const setCellRef = useCallback(
    (index: number, field: keyof TableQuestion, el: HTMLDivElement | null) => {
      const key = `${index}:${field}`;
      if (!el) {
        cellRefs.current.delete(key);
        return;
      }
      cellRefs.current.set(key, el);
    },
    []
  );

  const applyFormat = useCallback(
    (cmd: 'bold' | 'italic' | 'underline' | 'removeFormat') => {
      if (!activeCell) return;

      const key = `${activeCell.index}:${activeCell.field}`;
      const el = cellRefs.current.get(key);
      if (!el) return;

      el.focus();
      document.execCommand(cmd);

      updateQuestion(activeCell.index, activeCell.field, el.innerHTML || '');
    },
    [activeCell, updateQuestion]
  );

  return (
    <div className="space-y-4">
      {/* Toggle paste mode */}
      <div className="flex items-center gap-2">
        <Button
          variant={pasteMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPasteMode(!pasteMode)}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          {pasteMode ? 'Đang nhập từ clipboard' : 'Paste từ Excel/Sheets'}
        </Button>
        {!pasteMode && (
          <span className="text-sm text-muted-foreground">
            hoặc nhập trực tiếp vào bảng bên dưới
          </span>
        )}
      </div>

      {/* Paste area */}
      {pasteMode && (
        <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4">
          <p className="mb-2 text-sm text-muted-foreground">
            Copy dữ liệu từ Excel/Sheets (7 cột: Câu hỏi, Đáp án A, B, C, D, Đáp án đúng, Giải thích) và paste vào đây:
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste dữ liệu vào đây..."
            className="mb-3 min-h-[120px] font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={handlePaste} size="sm">
              Xác nhận
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPasteMode(false);
                setPasteText('');
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

      {/* Table input */}
      {!pasteMode && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
            <span className="text-sm text-muted-foreground">Định dạng:</span>
            <Button type="button" variant="outline" size="sm" onClick={() => applyFormat('bold')} disabled={!activeCell}>
              <span className="font-bold">B</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyFormat('italic')} disabled={!activeCell}>
              <span className="italic">I</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyFormat('underline')} disabled={!activeCell}>
              <span className="underline">U</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyFormat('removeFormat')} disabled={!activeCell}>
              Xóa định dạng
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">(Bôi đen text trong ô rồi bấm nút)</span>
          </div>

          {/* Questions list - styled as table */}
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_auto] gap-3 bg-muted/50 px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">#</span>
              <span className="text-sm font-medium text-muted-foreground">Nội dung câu hỏi</span>
              <span className="text-sm font-medium text-muted-foreground">Thao tác</span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-border">
            {questions.map((q, index) => (
              <Collapsible
                key={index}
                open={expandedRows.has(index)}
                onOpenChange={() => toggleRowExpanded(index)}
              >
                <div className="bg-card hover:bg-muted/20 transition-colors">
                  {/* Header row - always visible */}
                  <div className="flex items-start gap-3 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground mt-1">
                      {index + 1}
                    </span>
                    
                    <div className="flex-1 space-y-3">
                      <RichTextEditable
                        ref={(el) => setCellRef(index, 'content', el)}
                        value={q.content}
                        placeholder="Nội dung câu hỏi (đề bài)..."
                        className="min-h-[48px]"
                        onFocus={() => setActiveCell({ index, field: 'content' })}
                        onChange={(v) => updateQuestion(index, 'content', v)}
                      />
                      
                      {/* Quick info badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {q.image_url && (
                          <span className="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <Image className="h-3 w-3" /> Có hình ảnh
                          </span>
                        )}
                        {q.audio_url && (
                          <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <Volume2 className="h-3 w-3" /> Có âm thanh
                          </span>
                        )}
                        {q.subQuestions && q.subQuestions.length > 0 && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            {q.subQuestions.length} câu con
                          </span>
                        )}
                        {q.correct_option && !q.subQuestions?.length && (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Đáp án: {q.correct_option}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {expandedRows.has(index) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={questions.length === 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  <CollapsibleContent>
                    <div className="border-t border-border p-4 space-y-4">
                      {/* Media uploads */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Hình ảnh</label>
                          <MediaUpload
                            type="image"
                            value={q.image_url}
                            onChange={(url) => updateQuestion(index, 'image_url', url)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Âm thanh</label>
                          <MediaUpload
                            type="audio"
                            value={q.audio_url}
                            onChange={(url) => updateQuestion(index, 'audio_url', url)}
                          />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">Đáp án trực tiếp HOẶC câu hỏi con</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      {/* Direct answers (for simple questions) */}
                      {(!q.subQuestions || q.subQuestions.length === 0) && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground">Đáp án trực tiếp</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">Đáp án A</label>
                              <RichTextEditable
                                ref={(el) => setCellRef(index, 'option_a', el)}
                                value={q.option_a}
                                placeholder="Đáp án A"
                                onFocus={() => setActiveCell({ index, field: 'option_a' })}
                                onChange={(v) => updateQuestion(index, 'option_a', v)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Đáp án B</label>
                              <RichTextEditable
                                ref={(el) => setCellRef(index, 'option_b', el)}
                                value={q.option_b}
                                placeholder="Đáp án B"
                                onFocus={() => setActiveCell({ index, field: 'option_b' })}
                                onChange={(v) => updateQuestion(index, 'option_b', v)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Đáp án C</label>
                              <RichTextEditable
                                ref={(el) => setCellRef(index, 'option_c', el)}
                                value={q.option_c}
                                placeholder="Đáp án C"
                                onFocus={() => setActiveCell({ index, field: 'option_c' })}
                                onChange={(v) => updateQuestion(index, 'option_c', v)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Đáp án D</label>
                              <RichTextEditable
                                ref={(el) => setCellRef(index, 'option_d', el)}
                                value={q.option_d}
                                placeholder="Đáp án D"
                                onFocus={() => setActiveCell({ index, field: 'option_d' })}
                                onChange={(v) => updateQuestion(index, 'option_d', v)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">Đáp án đúng</label>
                              <Select value={q.correct_option} onValueChange={(value) => updateQuestion(index, 'correct_option', value)}>
                                <SelectTrigger className="text-sm">
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
                            <div>
                              <label className="text-xs text-muted-foreground">Giải thích</label>
                              <RichTextEditable
                                ref={(el) => setCellRef(index, 'explanation', el)}
                                value={q.explanation}
                                placeholder="Giải thích (tùy chọn)"
                                onFocus={() => setActiveCell({ index, field: 'explanation' })}
                                onChange={(v) => updateQuestion(index, 'explanation', v)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-questions */}
                      <SubQuestionInput
                        subQuestions={q.subQuestions || []}
                        onChange={(subs) => updateQuestion(index, 'subQuestions', subs)}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Thêm câu hỏi
            </Button>
            <span className="text-sm text-muted-foreground">
              {validQuestions.length}/{questions.length} câu hỏi hợp lệ
            </span>
          </div>
        </>
      )}
    </div>
  );
}
