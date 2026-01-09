/**
 * TableImport - Component nhập câu hỏi trực tiếp bằng bảng
 * - Paste từ Word/Docs sẽ giữ in đậm / in nghiêng / gạch chân
 * - Có toolbar để tự bôi đen và bấm In đậm/In nghiêng/Gạch chân
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
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

export interface TableQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
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
};

type ActiveCell = { index: number; field: keyof TableQuestion } | null;

/**
 * Loại bỏ số thứ tự ở đầu câu hỏi (ví dụ: "1. Câu hỏi", "2) Nội dung", "3- Text")
 * Chỉ loại bỏ khi số đứng đầu và theo sau bởi dấu phân cách (.  )  -  :)
 */
function removeQuestionNumber(text: string): string {
  // Pattern: số ở đầu (có thể có khoảng trắng) + dấu phân cách (. ) - :) + khoảng trắng
  // Ví dụ: "1. Câu hỏi", "2) Nội dung", "3- Text", "4: Câu", "  5.  Nội dung"
  return text.replace(/^\s*\d+\s*[.\-):]\s*/, '');
}

export function TableImport({ onQuestionsChange }: TableImportProps) {
  const [questions, setQuestions] = useState<TableQuestion[]>([{ ...emptyQuestion }]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);

  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const updateQuestion = useCallback(
    (index: number, field: keyof TableQuestion, value: string) => {
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
        (q) => q.content && q.option_a && q.option_b && q.option_c && q.option_d && q.correct_option
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

      // Đồng bộ lại state từ DOM sau khi apply định dạng
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
            hoặc nhập trực tiếp vào bảng bên dưới (có thể paste từ Word/Docs để giữ in đậm)
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

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[260px]">Câu hỏi</TableHead>
                  <TableHead className="min-w-[160px]">Đáp án A</TableHead>
                  <TableHead className="min-w-[160px]">Đáp án B</TableHead>
                  <TableHead className="min-w-[160px]">Đáp án C</TableHead>
                  <TableHead className="min-w-[160px]">Đáp án D</TableHead>
                  <TableHead className="w-[100px]">Đúng</TableHead>
                  <TableHead className="min-w-[220px]">Giải thích</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {questions.map((q, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>

                    <TableCell>
                      <RichTextEditable
                        ref={(el) => setCellRef(index, 'content', el)}
                        value={q.content}
                        placeholder="Nội dung câu hỏi..."
                        className="min-h-[64px]"
                        onFocus={() => setActiveCell({ index, field: 'content' })}
                        onChange={(v) => updateQuestion(index, 'content', v)}
                      />
                    </TableCell>

                    <TableCell>
                      <RichTextEditable
                        ref={(el) => setCellRef(index, 'option_a', el)}
                        value={q.option_a}
                        placeholder="Đáp án A"
                        onFocus={() => setActiveCell({ index, field: 'option_a' })}
                        onChange={(v) => updateQuestion(index, 'option_a', v)}
                      />
                    </TableCell>

                    <TableCell>
                      <RichTextEditable
                        ref={(el) => setCellRef(index, 'option_b', el)}
                        value={q.option_b}
                        placeholder="Đáp án B"
                        onFocus={() => setActiveCell({ index, field: 'option_b' })}
                        onChange={(v) => updateQuestion(index, 'option_b', v)}
                      />
                    </TableCell>

                    <TableCell>
                      <RichTextEditable
                        ref={(el) => setCellRef(index, 'option_c', el)}
                        value={q.option_c}
                        placeholder="Đáp án C"
                        onFocus={() => setActiveCell({ index, field: 'option_c' })}
                        onChange={(v) => updateQuestion(index, 'option_c', v)}
                      />
                    </TableCell>

                    <TableCell>
                      <RichTextEditable
                        ref={(el) => setCellRef(index, 'option_d', el)}
                        value={q.option_d}
                        placeholder="Đáp án D"
                        onFocus={() => setActiveCell({ index, field: 'option_d' })}
                        onChange={(v) => updateQuestion(index, 'option_d', v)}
                      />
                    </TableCell>

                    <TableCell>
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
                    </TableCell>

                    <TableCell>
                      <RichTextEditable
                        ref={(el) => setCellRef(index, 'explanation', el)}
                        value={q.explanation}
                        placeholder="Giải thích (tùy chọn)"
                        className="min-h-[64px]"
                        onFocus={() => setActiveCell({ index, field: 'explanation' })}
                        onChange={(v) => updateQuestion(index, 'explanation', v)}
                      />
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={questions.length === 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Thêm hàng
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
