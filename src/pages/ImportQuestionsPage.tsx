/**
 * ImportQuestionsPage - Trang import câu hỏi từ file Excel/CSV hoặc nhập trực tiếp bằng bảng
 * Hỗ trợ tạo môn học, cấp độ, phần mới và import câu hỏi
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, LogIn, Shield, Table2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TableImport, type TableQuestion } from '@/components/admin/TableImport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sanitizeRichText } from '@/lib/richText';

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

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  has_levels: boolean;
}

interface Level {
  id: string;
  name: string;
  slug: string;
  subject_id: string | null;
  description: string | null;
}

interface Section {
  id: string;
  name: string;
  slug: string;
  level_id: string;
  description: string | null;
}

function isValidTableQuestion(q: TableQuestion): boolean {
  const optionCount = q.option_count ?? 4;
  const questionType = q.question_type ?? 'standard';
  
  // For audio_only questions with sub-questions, only need audio
  if (questionType === 'audio_only' && q.subQuestions && q.subQuestions.length > 0) {
    return q.subQuestions.some(sq => {
      const sqType = sq.question_type ?? 'standard';
      if (sqType === 'audio_only') return !!sq.correct_option;
      const sqCount = sq.option_count ?? 4;
      const hasReqOpts = !!sq.option_a && !!sq.option_b && 
        (sqCount < 3 || !!sq.option_c) && (sqCount < 4 || !!sq.option_d);
      return !!sq.content && hasReqOpts && !!sq.correct_option;
    });
  }
  
  // For audio_only without sub-questions
  if (questionType === 'audio_only') {
    return !!q.correct_option;
  }
  
  // For standard/image_based, content is required
  if (!q.content) return false;

  // Check direct answer based on option_count
  const hasRequiredOptions = 
    !!q.option_a && !!q.option_b && 
    (optionCount < 3 || !!q.option_c) && 
    (optionCount < 4 || !!q.option_d);
  
  const hasDirectAnswer = hasRequiredOptions && !!q.correct_option;

  const hasValidSubQuestions = (q.subQuestions ?? []).some(sq => {
    const sqType = sq.question_type ?? 'standard';
    if (sqType === 'audio_only') return !!sq.correct_option;
    const sqCount = sq.option_count ?? 4;
    const hasReqOpts = !!sq.option_a && !!sq.option_b && 
      (sqCount < 3 || !!sq.option_c) && (sqCount < 4 || !!sq.option_d);
    return !!sq.content && hasReqOpts && !!sq.correct_option;
  });

  return hasDirectAnswer || hasValidSubQuestions;
}

const ImportQuestionsPage = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [tableQuestions, setTableQuestions] = useState<TableQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'table' | 'file'>('table');

  const validTableQuestionsCount = useMemo(
    () => tableQuestions.filter(isValidTableQuestion).length,
    [tableQuestions]
  );

  // Data from database
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected values
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Get selected subject
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const subjectHasLevels = selectedSubject?.has_levels ?? true;

  // Tải dữ liệu từ database
  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsRes, levelsRes, sectionsRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('levels').select('*').order('order_index'),
          supabase.from('sections').select('*').order('order_index'),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (levelsRes.error) throw levelsRes.error;
        if (sectionsRes.error) throw sectionsRes.error;

        setSubjects(subjectsRes.data || []);
        setLevels(levelsRes.data || []);
        setSections(sectionsRes.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Reset selections when parent changes
  useEffect(() => {
    setSelectedLevelId('');
    setSelectedSectionId('');
  }, [selectedSubjectId]);

  useEffect(() => {
    setSelectedSectionId('');
  }, [selectedLevelId]);

  // Reset form data when section changes
  useEffect(() => {
    setTableQuestions([]);
    setParsedQuestions([]);
    setFile(null);
    setImportResult(null);
  }, [selectedSectionId]);

  // Filter levels and sections based on selection
  const filteredLevels = levels.filter(l => l.subject_id === selectedSubjectId);
  const filteredSections = subjectHasLevels
    ? sections.filter(s => s.level_id === selectedLevelId)
    : sections.filter(s => {
        const level = levels.find(l => l.id === s.level_id);
        return level?.subject_id === selectedSubjectId;
      });

  // Parse CSV file
  const parseCSV = useCallback((text: string): ParsedQuestion[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const dataLines = lines.slice(1);
    const questions: ParsedQuestion[] = [];

    dataLines.forEach((line) => {
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
        let correctOption = values[5]?.trim().toUpperCase();
        
        // Support both formats: "A/B/C/D" or "option_a/option_b/option_c/option_d"
        if (correctOption.startsWith('OPTION_')) {
          correctOption = correctOption.replace('OPTION_', '');
        }
        
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

  // Import questions to database with duplicate check
  const handleImport = useCallback(async () => {
    const questionsToImport =
      importMode === 'table'
        ? tableQuestions.filter(isValidTableQuestion)
        : parsedQuestions;

    if (!selectedSectionId || questionsToImport.length === 0) {
      toast.error('Vui lòng chọn phần và nhập câu hỏi');
      return;
    }

    setIsLoading(true);
    const result: ImportResult & { duplicates: number } = { success: 0, failed: 0, duplicates: 0, errors: [] };

    try {
      // Fetch existing questions in this section to check for duplicates
      const { data: existingQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('content')
        .eq('section_id', selectedSectionId);

      if (fetchError) {
        console.error('Error fetching existing questions:', fetchError);
        toast.error('Lỗi khi kiểm tra câu hỏi trùng lặp');
        setIsLoading(false);
        return;
      }

      const normalizeContent = (content: string) => {
        // so sánh trùng lặp theo text thuần (bỏ tag HTML)
        return content
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      };

      // Create a Set of existing question contents for fast lookup
      const existingContents = new Set(
        (existingQuestions || []).map(q => normalizeContent(q.content))
      );

      for (let i = 0; i < questionsToImport.length; i++) {
        const q = questionsToImport[i];
        const normalizedContent = normalizeContent(q.content);

        // Check for duplicate
        if (existingContents.has(normalizedContent)) {
          result.duplicates++;
          continue; // Skip duplicate
        }

        const explanationRaw = (q as { explanation?: string }).explanation;
        const safeExplanation = explanationRaw && explanationRaw.trim().length > 0
          ? sanitizeRichText(explanationRaw)
          : null;

        const { data: parentQuestion, error } = await supabase
          .from('questions')
          .insert({
            section_id: selectedSectionId,
            content: sanitizeRichText(q.content),
            option_a: sanitizeRichText(q.option_a || ''),
            option_b: sanitizeRichText(q.option_b || ''),
            option_c: sanitizeRichText(q.option_c || '') || null,
            option_d: sanitizeRichText(q.option_d || '') || null,
            correct_option: q.correct_option || 'A',
            explanation: safeExplanation,
            image_url: (q as TableQuestion).image_url || null,
            audio_url: (q as TableQuestion).audio_url || null,
            question_type: (q as TableQuestion).question_type || 'standard',
            option_count: (q as TableQuestion).option_count || 4,
          })
          .select('id')
          .single();

        // Insert sub-questions if any
        const subQuestions = (q as TableQuestion).subQuestions;
        if (!error && parentQuestion && subQuestions && subQuestions.length > 0) {
          for (const sq of subQuestions) {
            await supabase.from('questions').insert({
              section_id: selectedSectionId,
              parent_id: parentQuestion.id,
              content: sanitizeRichText(sq.content),
              option_a: sanitizeRichText(sq.option_a),
              option_b: sanitizeRichText(sq.option_b),
              option_c: sanitizeRichText(sq.option_c || '') || null,
              option_d: sanitizeRichText(sq.option_d || '') || null,
              correct_option: sq.correct_option,
              explanation: sq.explanation ? sanitizeRichText(sq.explanation) : null,
              question_type: sq.question_type || 'standard',
              option_count: sq.option_count || 4,
            });
          }
        }

        if (error) {
          result.failed++;
          result.errors.push(`Câu ${i + 1}: ${error.message}`);
        } else {
          result.success++;
          // Add to set to prevent duplicates within the same import batch
          existingContents.add(normalizedContent);
        }
      }

      setImportResult(result);

      const messages: string[] = [];
      if (result.success > 0) messages.push(`${result.success} câu hỏi mới`);
      if (result.duplicates > 0) messages.push(`${result.duplicates} câu trùng lặp bỏ qua`);
      if (result.failed > 0) messages.push(`${result.failed} lỗi`);

      if (result.success > 0) {
        toast.success(`Import thành công: ${messages.join(', ')}`);
        // Reset form to import more questions quickly
        setTableQuestions([]);
        setParsedQuestions([]);
        setFile(null);
        setImportResult(null);
      } else if (result.duplicates > 0) {
        toast.warning(`Tất cả ${result.duplicates} câu hỏi đều trùng lặp`);
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
  }, [selectedSectionId, parsedQuestions, tableQuestions, importMode]);

  // Download sample template
  const downloadTemplate = useCallback(() => {
    const headers = 'câu hỏi,đáp án 1,đáp án 2,đáp án 3,đáp án 4,đáp án đúng,giải thích';
    const sample1 = '"「やま」の漢字はどれですか。","川","山","田","森","B","山 có nghĩa là núi"';
    const sample2 = '"「みず」の漢字はどれですか。","火","土","水","金","C",""';
    const csv = `${headers}\n${sample1}\n${sample2}`;

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau_import_cau_hoi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mx-auto max-w-md text-center">
            <LogIn className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Yêu cầu đăng nhập</h1>
            <p className="mb-6 text-muted-foreground">
              Bạn cần đăng nhập với tài khoản admin để import câu hỏi
            </p>
            <Link to="/auth">
              <Button className="gap-2">
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mx-auto max-w-md text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Không có quyền truy cập</h1>
            <p className="mb-6 text-muted-foreground">
              Chỉ admin mới có thể import câu hỏi. Liên hệ quản trị viên để được cấp quyền.
            </p>
            <Link to="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              Import câu hỏi
            </h1>
            <p className="text-muted-foreground">
              Nhập trực tiếp vào bảng hoặc tải lên file CSV để thêm câu hỏi vào ngân hàng
            </p>
          </div>

          {/* Select subject */}
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold text-foreground">1. Chọn môn học</h2>
            <div className="mb-4">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={loadingData}
              >
                <option value="">-- Chọn môn học --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {!s.has_levels && '(không có cấp độ)'}
                  </option>
                ))}
              </select>
            </div>
            {subjects.length === 0 && !loadingData && (
              <p className="text-sm text-muted-foreground">
                Chưa có môn học. <Link to="/manage-subjects" className="text-primary hover:underline">Thêm môn học</Link> trước khi import.
              </p>
            )}
          </div>

          {/* Select level (if subject has levels) */}
          {selectedSubjectId && subjectHasLevels && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">2. Chọn cấp độ</h2>
              <div className="mb-4">
                <select
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Chọn cấp độ --</option>
                  {filteredLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              {filteredLevels.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chưa có cấp độ. <Link to="/manage-subjects" className="text-primary hover:underline">Thêm cấp độ</Link> trước.
                </p>
              )}
            </div>
          )}

          {/* Select section */}
          {((selectedSubjectId && !subjectHasLevels) || selectedLevelId) && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">
                {subjectHasLevels ? '3.' : '2.'} Chọn phần
              </h2>
              <div className="mb-4">
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Chọn phần --</option>
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {filteredSections.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chưa có phần luyện thi. <Link to="/manage-subjects" className="text-primary hover:underline">Thêm phần</Link> trước.
                </p>
              )}
            </div>
          )}

          {/* Input questions - Tabs for table/file */}
          {selectedSectionId && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">
                {subjectHasLevels ? '4.' : '3.'} Nhập câu hỏi
              </h2>
              
              <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'table' | 'file')} className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="table" className="gap-2">
                    <Table2 className="h-4 w-4" />
                    Nhập trực tiếp
                  </TabsTrigger>
                  <TabsTrigger value="file" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Tải file CSV
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="table" className="mt-0">
                  <TableImport onQuestionsChange={setTableQuestions} />
                </TabsContent>

                <TabsContent value="file" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={downloadTemplate} size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Tải file mẫu
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Tải về để xem định dạng chuẩn
                      </span>
                    </div>

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
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Đã đọc {parsedQuestions.length} câu hỏi từ file
                      </div>
                    )}

                    {/* Preview from file */}
                    {parsedQuestions.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <h3 className="mb-2 text-sm font-medium text-foreground">Xem trước</h3>
                        <div className="max-h-48 space-y-2 overflow-y-auto">
                          {parsedQuestions.slice(0, 3).map((q, i) => (
                            <div key={i} className="rounded bg-background p-2 text-xs">
                              <p className="mb-1 font-medium">{i + 1}. {q.content}</p>
                              <p className="text-muted-foreground">
                                A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d}
                              </p>
                              <p className="text-success">Đáp án: {q.correct_option}</p>
                            </div>
                          ))}
                          {parsedQuestions.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              ... và {parsedQuestions.length - 3} câu khác
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Import button */}
          {selectedSectionId && (
            <Button
              onClick={handleImport}
              disabled={
                isLoading ||
                (importMode === 'table'
                  ? validTableQuestionsCount === 0
                  : parsedQuestions.length === 0)
              }
              size="lg"
              className="w-full gap-2"
            >
              <Upload className="h-5 w-5" />
              {isLoading
                ? 'Đang import...'
                : `Import ${
                    importMode === 'table'
                      ? validTableQuestionsCount
                      : parsedQuestions.length
                  } câu hỏi`}
            </Button>
          )}

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
