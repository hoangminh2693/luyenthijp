/**
 * ImportQuestionsPage - Trang import câu hỏi từ file Excel/CSV
 * Hỗ trợ tạo môn học, cấp độ, phần mới và import câu hỏi
 */
import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, LogIn, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { SubjectManager } from '@/components/admin/SubjectManager';
import { LevelManager } from '@/components/admin/LevelManager';
import { SectionManager } from '@/components/admin/SectionManager';

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

const ImportQuestionsPage = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

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

          {/* Select subject */}
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold text-foreground">2. Chọn môn học</h2>
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
            <SubjectManager
              subjects={subjects}
              onSubjectCreated={(subject) => {
                setSubjects([...subjects, subject]);
                setSelectedSubjectId(subject.id);
              }}
            />
          </div>

          {/* Select level (if subject has levels) */}
          {selectedSubjectId && subjectHasLevels && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">3. Chọn cấp độ</h2>
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
              <LevelManager
                subjectId={selectedSubjectId}
                levels={levels}
                onLevelCreated={(level) => {
                  setLevels([...levels, level]);
                  setSelectedLevelId(level.id);
                }}
              />
            </div>
          )}

          {/* Select section */}
          {((selectedSubjectId && !subjectHasLevels) || selectedLevelId) && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">
                {subjectHasLevels ? '4.' : '3.'} Chọn phần
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
              {selectedLevelId && (
                <SectionManager
                  levelId={selectedLevelId}
                  sections={sections}
                  onSectionCreated={(section) => {
                    setSections([...sections, section]);
                    setSelectedSectionId(section.id);
                  }}
                />
              )}
            </div>
          )}

          {/* Upload file */}
          {selectedSectionId && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">
                {subjectHasLevels ? '5.' : '4.'} Tải file câu hỏi
              </h2>

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
          )}

          {/* Preview */}
          {parsedQuestions.length > 0 && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-semibold text-foreground">Xem trước</h2>
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
          {selectedSectionId && (
            <Button
              onClick={handleImport}
              disabled={isLoading || parsedQuestions.length === 0}
              size="lg"
              className="w-full gap-2"
            >
              <Upload className="h-5 w-5" />
              {isLoading ? 'Đang import...' : `Import ${parsedQuestions.length} câu hỏi`}
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
