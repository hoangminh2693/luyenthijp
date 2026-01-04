/**
 * ImportQuestionsPage - Trang import câu hỏi từ file Excel/CSV
 */
import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface SectionOption {
  id: string;
  name: string;
  level_name: string;
  subject_name: string;
}

const ImportQuestionsPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);

  // Tải danh sách sections từ database
  useEffect(() => {
    const loadSections = async () => {
      try {
        const { data, error } = await supabase
          .from('sections')
          .select(`
            id,
            name,
            levels!inner (
              name,
              subjects!inner (
                name
              )
            )
          `);

        if (error) throw error;

        const formattedSections = data?.map((s: any) => ({
          id: s.id,
          name: s.name,
          level_name: s.levels?.name || '',
          subject_name: s.levels?.subjects?.name || '',
        })) || [];

        setSections(formattedSections);
      } catch (err) {
        console.error('Error loading sections:', err);
      } finally {
        setLoadingSections(false);
      }
    };

    loadSections();
  });

  // Parse CSV file
  const parseCSV = useCallback((text: string): ParsedQuestion[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header row
    const dataLines = lines.slice(1);
    const questions: ParsedQuestion[] = [];

    dataLines.forEach((line, index) => {
      // Handle CSV with quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length >= 6) {
        const correctOption = values[5]?.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(correctOption)) {
          questions.push({
            content: values[0] || '',
            option_a: values[1] || '',
            option_b: values[2] || '',
            option_c: values[3] || '',
            option_d: values[4] || '',
            correct_option: correctOption,
            explanation: values[6] || undefined,
          });
        }
      }
    });

    return questions;
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const questions = parseCSV(text);
      setParsedQuestions(questions);

      if (questions.length === 0) {
        toast.error('Không tìm thấy câu hỏi hợp lệ trong file');
      } else {
        toast.success(`Đã đọc ${questions.length} câu hỏi từ file`);
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      toast.error('Lỗi khi đọc file. Vui lòng kiểm tra định dạng.');
    }
  }, [parseCSV]);

  // Import questions to database
  const handleImport = useCallback(async () => {
    if (!selectedSectionId || parsedQuestions.length === 0) {
      toast.error('Vui lòng chọn phần và tải file câu hỏi');
      return;
    }

    setIsLoading(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        
        const { error } = await supabase
          .from('questions')
          .insert({
            section_id: selectedSectionId,
            content: q.content,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            explanation: q.explanation,
          });

        if (error) {
          result.failed++;
          result.errors.push(`Câu ${i + 1}: ${error.message}`);
        } else {
          result.success++;
        }
      }

      setImportResult(result);
      
      if (result.success > 0) {
        toast.success(`Đã import ${result.success} câu hỏi thành công`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} câu hỏi không import được`);
      }
    } catch (err) {
      console.error('Error importing:', err);
      toast.error('Lỗi khi import câu hỏi');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSectionId, parsedQuestions]);

  // Download sample template
  const downloadTemplate = useCallback(() => {
    const headers = 'content,option_a,option_b,option_c,option_d,correct_option,explanation';
    const sample1 = '"「やま」の漢字はどれですか。","川","山","田","森","B","山 có nghĩa là núi"';
    const sample2 = '"「みず」の漢字はどれですか。","火","土","水","金","C",""';
    const csv = `${headers}\n${sample1}\n${sample2}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_questions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', href: '/' },
              { label: 'Import câu hỏi' },
            ]}
          />
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              Import câu hỏi từ CSV
            </h1>
            <p className="text-muted-foreground">
              Tải lên file CSV chứa danh sách câu hỏi để thêm vào ngân hàng câu hỏi
            </p>
          </div>

          {/* Download template */}
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold text-foreground">1. Tải file mẫu</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Tải file mẫu để xem định dạng chuẩn của file CSV
            </p>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Tải file mẫu (CSV)
            </Button>
          </div>

          {/* Select section */}
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold text-foreground">2. Chọn phần để import</h2>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loadingSections}
            >
              <option value="">-- Chọn phần --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject_name} / {s.level_name} / {s.name}
                </option>
              ))}
            </select>
            {sections.length === 0 && !loadingSections && (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có phần nào trong database. Vui lòng thêm dữ liệu môn học, cấp độ và phần trước.
              </p>
            )}
          </div>

          {/* Upload file */}
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold text-foreground">3. Tải file câu hỏi</h2>
            
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
              <FileSpreadsheet className="mb-3 h-12 w-12 text-muted-foreground" />
              <span className="mb-1 font-medium text-foreground">
                {file ? file.name : 'Chọn file CSV'}
              </span>
              <span className="text-sm text-muted-foreground">
                Click để chọn hoặc kéo thả file vào đây
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {parsedQuestions.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Đã đọc {parsedQuestions.length} câu hỏi từ file
              </div>
            )}
          </div>

          {/* Preview */}
          {parsedQuestions.length > 0 && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">4. Xem trước</h2>
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {parsedQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 p-3 text-sm">
                    <p className="mb-1 font-medium">{i + 1}. {q.content}</p>
                    <p className="text-muted-foreground">
                      A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d}
                    </p>
                    <p className="text-success">Đáp án đúng: {q.correct_option}</p>
                  </div>
                ))}
                {parsedQuestions.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    ... và {parsedQuestions.length - 5} câu hỏi khác
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import button */}
          <Button
            onClick={handleImport}
            disabled={isLoading || !selectedSectionId || parsedQuestions.length === 0}
            size="lg"
            className="w-full gap-2"
          >
            <Upload className="h-5 w-5" />
            {isLoading ? 'Đang import...' : `Import ${parsedQuestions.length} câu hỏi`}
          </Button>

          {/* Import result */}
          {importResult && (
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">Kết quả import</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Thành công: {importResult.success} câu
                </div>
                {importResult.failed > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-error">
                      <AlertCircle className="h-4 w-4" />
                      Thất bại: {importResult.failed} câu
                    </div>
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                      {importResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportQuestionsPage;
