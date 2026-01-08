/**
 * TableImport - Component nhập câu hỏi trực tiếp bằng bảng
 * Cho phép copy/paste từ Excel hoặc nhập tay từng ô
 */
import { useState, useCallback } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function TableImport({ onQuestionsChange }: TableImportProps) {
  const [questions, setQuestions] = useState<TableQuestion[]>([{ ...emptyQuestion }]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const updateQuestion = useCallback((index: number, field: keyof TableQuestion, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
    onQuestionsChange(updated);
  }, [questions, onQuestionsChange]);

  const addRow = useCallback(() => {
    const updated = [...questions, { ...emptyQuestion }];
    setQuestions(updated);
    onQuestionsChange(updated);
  }, [questions, onQuestionsChange]);

  const removeRow = useCallback((index: number) => {
    if (questions.length === 1) return;
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    onQuestionsChange(updated);
  }, [questions, onQuestionsChange]);

  // Xử lý paste từ Excel/Sheets
  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;

    const lines = pasteText.trim().split('\n');
    const parsed: TableQuestion[] = [];

    lines.forEach(line => {
      // Tab-separated hoặc comma-separated
      const values = line.includes('\t') ? line.split('\t') : line.split(',');
      
      if (values.length >= 5) {
        let correctOption = values[5]?.trim().toUpperCase() || '';
        if (correctOption.startsWith('OPTION_')) {
          correctOption = correctOption.replace('OPTION_', '');
        }

        parsed.push({
          content: values[0]?.trim() || '',
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

  const validQuestions = questions.filter(q => 
    q.content && q.option_a && q.option_b && q.option_c && q.option_d && q.correct_option
  );

  return (
    <div className="space-y-4">
      {/* Toggle paste mode */}
      <div className="flex items-center gap-2">
        <Button
          variant={pasteMode ? "default" : "outline"}
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
              onClick={() => { setPasteMode(false); setPasteText(''); }}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

      {/* Table input */}
      {!pasteMode && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[200px]">Câu hỏi</TableHead>
                  <TableHead className="min-w-[120px]">Đáp án A</TableHead>
                  <TableHead className="min-w-[120px]">Đáp án B</TableHead>
                  <TableHead className="min-w-[120px]">Đáp án C</TableHead>
                  <TableHead className="min-w-[120px]">Đáp án D</TableHead>
                  <TableHead className="w-[100px]">Đúng</TableHead>
                  <TableHead className="min-w-[150px]">Giải thích</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={q.content}
                        onChange={(e) => updateQuestion(index, 'content', e.target.value)}
                        placeholder="Nội dung câu hỏi..."
                        className="min-h-[60px] text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={q.option_a}
                        onChange={(e) => updateQuestion(index, 'option_a', e.target.value)}
                        placeholder="Đáp án A"
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={q.option_b}
                        onChange={(e) => updateQuestion(index, 'option_b', e.target.value)}
                        placeholder="Đáp án B"
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={q.option_c}
                        onChange={(e) => updateQuestion(index, 'option_c', e.target.value)}
                        placeholder="Đáp án C"
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={q.option_d}
                        onChange={(e) => updateQuestion(index, 'option_d', e.target.value)}
                        placeholder="Đáp án D"
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={q.correct_option}
                        onValueChange={(value) => updateQuestion(index, 'correct_option', value)}
                      >
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
                      <Input
                        value={q.explanation}
                        onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                        placeholder="Giải thích (tùy chọn)"
                        className="text-sm"
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
