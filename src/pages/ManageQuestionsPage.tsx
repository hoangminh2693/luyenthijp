/**
 * ManageQuestionsPage - Trang quản lý câu hỏi đã import
 * Cho phép xem, sửa, xóa câu hỏi
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogIn, Shield, Pencil, Trash2, Search, ChevronDown, Save, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RichTextEditable } from '@/components/admin/RichTextEditable';

interface Subject {
  id: string;
  name: string;
  slug: string;
  has_levels: boolean;
}

interface Level {
  id: string;
  name: string;
  slug: string;
  subject_id: string | null;
}

interface Section {
  id: string;
  name: string;
  slug: string;
  level_id: string;
}

interface Question {
  id: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  section_id: string;
  created_at: string;
}

const ManageQuestionsPage = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Edit dialog
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Get selected subject
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectHasLevels = selectedSubject?.has_levels ?? true;

  // Filter levels and sections
  const filteredLevels = levels.filter((l) => l.subject_id === selectedSubjectId);
  const filteredSections = subjectHasLevels
    ? sections.filter((s) => s.level_id === selectedLevelId)
    : sections.filter((s) => {
        const level = levels.find((l) => l.id === s.level_id);
        return level?.subject_id === selectedSubjectId;
      });

  // Load initial data
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
    setQuestions([]);
  }, [selectedSubjectId]);

  useEffect(() => {
    setSelectedSectionId('');
    setQuestions([]);
  }, [selectedLevelId]);

  // Load questions when section changes
  useEffect(() => {
    if (!selectedSectionId) {
      setQuestions([]);
      return;
    }

    const loadQuestions = async () => {
      setLoadingQuestions(true);
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('section_id', selectedSectionId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setQuestions(data || []);
      } catch (err) {
        console.error('Error loading questions:', err);
        toast.error('Lỗi khi tải câu hỏi');
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [selectedSectionId]);

  // Filter questions by search
  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const textContent = q.content.replace(/<[^>]*>/g, '').toLowerCase();
    return textContent.includes(query);
  });

  // Open edit dialog
  const openEditDialog = useCallback((question: Question) => {
    setEditingQuestion(question);
    setEditForm({
      content: question.content,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_option: question.correct_option,
      explanation: question.explanation || '',
    });
  }, []);

  // Save edited question
  const handleSave = useCallback(async () => {
    if (!editingQuestion) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          content: editForm.content,
          option_a: editForm.option_a,
          option_b: editForm.option_b,
          option_c: editForm.option_c,
          option_d: editForm.option_d,
          correct_option: editForm.correct_option,
          explanation: editForm.explanation || null,
        })
        .eq('id', editingQuestion.id);

      if (error) throw error;

      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id
            ? { ...q, ...editForm, explanation: editForm.explanation || null }
            : q
        )
      );

      // Invalidate questions cache so QuizPage gets fresh data
      queryClient.invalidateQueries({ queryKey: ['questions'] });

      toast.success('Đã lưu câu hỏi');
      setEditingQuestion(null);
    } catch (err) {
      console.error('Error saving question:', err);
      toast.error('Lỗi khi lưu câu hỏi');
    } finally {
      setSaving(false);
    }
  }, [editingQuestion, editForm]);

  // Delete question
  const handleDelete = useCallback(async () => {
    if (!deletingQuestion) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('questions').delete().eq('id', deletingQuestion.id);

      if (error) throw error;

      // Update local state
      setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestion.id));

      // Invalidate questions cache so QuizPage gets fresh data
      queryClient.invalidateQueries({ queryKey: ['questions'] });

      toast.success('Đã xóa câu hỏi');
      setDeletingQuestion(null);
    } catch (err) {
      console.error('Error deleting question:', err);
      toast.error('Lỗi khi xóa câu hỏi');
    } finally {
      setDeleting(false);
    }
  }, [deletingQuestion]);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              Bạn cần đăng nhập với tài khoản admin để quản lý câu hỏi
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
              Chỉ admin mới có thể quản lý câu hỏi.
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
              { label: 'Quản lý câu hỏi' },
            ]}
          />
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Quản lý câu hỏi</h1>
            <p className="text-muted-foreground">Xem, sửa và xóa câu hỏi đã import</p>
          </div>

          {/* Filters */}
          <div className="mb-6 grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Subject */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Môn học</label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={loadingData}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            {selectedSubjectId && subjectHasLevels && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Cấp độ</label>
                <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn cấp độ" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLevels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Section */}
            {((selectedSubjectId && !subjectHasLevels) || selectedLevelId) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Phần</label>
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phần" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search */}
            {selectedSectionId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Tìm kiếm</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm câu hỏi..."
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Questions list */}
          {selectedSectionId && (
            <div className="space-y-3">
              {loadingQuestions ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Không tìm thấy câu hỏi phù hợp' : 'Chưa có câu hỏi nào'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Hiển thị {filteredQuestions.length} / {questions.length} câu hỏi
                  </p>
                  {filteredQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="mb-2 text-sm font-medium text-foreground"
                          dangerouslySetInnerHTML={{ __html: q.content }}
                        />
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className={q.correct_option === 'A' ? 'text-success font-medium' : ''}>
                            A: <span dangerouslySetInnerHTML={{ __html: q.option_a }} />
                          </span>
                          <span className={q.correct_option === 'B' ? 'text-success font-medium' : ''}>
                            B: <span dangerouslySetInnerHTML={{ __html: q.option_b }} />
                          </span>
                          <span className={q.correct_option === 'C' ? 'text-success font-medium' : ''}>
                            C: <span dangerouslySetInnerHTML={{ __html: q.option_c }} />
                          </span>
                          <span className={q.correct_option === 'D' ? 'text-success font-medium' : ''}>
                            D: <span dangerouslySetInnerHTML={{ __html: q.option_d }} />
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingQuestion(q)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {!selectedSectionId && (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <ChevronDown className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Chọn môn học, cấp độ và phần để xem câu hỏi</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sửa câu hỏi</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nội dung câu hỏi</label>
              <RichTextEditable
                value={editForm.content || ''}
                onChange={(v) => setEditForm((prev) => ({ ...prev, content: v }))}
                placeholder="Nội dung câu hỏi..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Đáp án A</label>
                <RichTextEditable
                  value={editForm.option_a || ''}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, option_a: v }))}
                  placeholder="Đáp án A"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Đáp án B</label>
                <RichTextEditable
                  value={editForm.option_b || ''}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, option_b: v }))}
                  placeholder="Đáp án B"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Đáp án C</label>
                <RichTextEditable
                  value={editForm.option_c || ''}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, option_c: v }))}
                  placeholder="Đáp án C"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Đáp án D</label>
                <RichTextEditable
                  value={editForm.option_d || ''}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, option_d: v }))}
                  placeholder="Đáp án D"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Đáp án đúng</label>
              <Select
                value={editForm.correct_option || ''}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, correct_option: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đáp án đúng" />
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
              <label className="mb-1 block text-sm font-medium">Giải thích (tùy chọn)</label>
              <RichTextEditable
                value={editForm.explanation || ''}
                onChange={(v) => setEditForm((prev) => ({ ...prev, explanation: v }))}
                placeholder="Giải thích đáp án..."
                className="min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa câu hỏi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa câu hỏi này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageQuestionsPage;
