/**
 * ManageQuestionsPage - Trang quản lý câu hỏi đã import
 * Cho phép xem, sửa, xóa câu hỏi
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogIn, Shield, Pencil, Trash2, Search, ChevronDown, Save, X, Image, Volume2, ArrowRightLeft, CheckSquare, Square, MoveRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { SubQuestionInput, type SubQuestion } from '@/components/admin/SubQuestionInput';
import { sanitizeRichText } from '@/lib/richText';
import { MediaUpload } from '@/components/admin/MediaUpload';

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

interface QuestionRow {
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
  parent_id?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
}

interface ParentQuestionRow extends QuestionRow {
  subQuestions?: QuestionRow[];
}

type EditQuestionForm = Partial<QuestionRow> & { subQuestions?: SubQuestion[]; newSectionId?: string };

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function groupQuestionsWithChildren(rows: QuestionRow[]): ParentQuestionRow[] {
  const parents = rows
    .filter((q) => !q.parent_id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const childrenByParent = new Map<string, QuestionRow[]>();
  rows
    .filter((q) => !!q.parent_id)
    .forEach((child) => {
      const parentId = child.parent_id as string;
      const list = childrenByParent.get(parentId) ?? [];
      list.push(child);
      childrenByParent.set(parentId, list);
    });

  // sort children by created_at
  childrenByParent.forEach((list, key) => {
    childrenByParent.set(
      key,
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    );
  });

  return parents.map((p) => ({ ...p, subQuestions: childrenByParent.get(p.id) ?? [] }));
}

const ManageQuestionsPage = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Edit dialog
  const [editingQuestion, setEditingQuestion] = useState<ParentQuestionRow | null>(null);
  const [editForm, setEditForm] = useState<EditQuestionForm>({ subQuestions: [] });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deletingQuestion, setDeletingQuestion] = useState<ParentQuestionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkMoveDialogOpen, setBulkMoveDialogOpen] = useState(false);
  const [bulkTargetSectionId, setBulkTargetSectionId] = useState<string>('');
  const [bulkMoving, setBulkMoving] = useState(false);

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
    setSelectedQuestionIds(new Set());
  }, [selectedSubjectId]);

  useEffect(() => {
    setSelectedSectionId('');
    setQuestions([]);
    setSelectedQuestionIds(new Set());
  }, [selectedLevelId]);

  // Load questions when section changes
  useEffect(() => {
    if (!selectedSectionId) {
      setQuestions([]);
      setSelectedQuestionIds(new Set());
      return;
    }

    const loadQuestions = async () => {
      setLoadingQuestions(true);
      setSelectedQuestionIds(new Set());
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

  const groupedQuestions = useMemo(() => groupQuestionsWithChildren(questions), [questions]);

  // Filter questions by search (tìm trong câu cha + câu con)
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return groupedQuestions;
    const query = searchQuery.toLowerCase();

    return groupedQuestions.filter((q) => {
      const parentText = stripHtml(q.content).toLowerCase();
      if (parentText.includes(query)) return true;

      const children = q.subQuestions ?? [];
      return children.some((c) => stripHtml(c.content).toLowerCase().includes(query));
    });
  }, [groupedQuestions, searchQuery]);

  // Bulk selection handlers
  const toggleQuestionSelection = useCallback((questionId: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedQuestionIds(new Set(filteredQuestions.map((q) => q.id)));
  }, [filteredQuestions]);

  const clearSelection = useCallback(() => {
    setSelectedQuestionIds(new Set());
  }, []);

  const isAllSelected = filteredQuestions.length > 0 && selectedQuestionIds.size === filteredQuestions.length;

  // Bulk move handler
  const handleBulkMove = useCallback(async () => {
    if (selectedQuestionIds.size === 0 || !bulkTargetSectionId) return;

    setBulkMoving(true);
    try {
      const questionIds = Array.from(selectedQuestionIds);
      
      // Update parent questions
      const { error: parentErr } = await supabase
        .from('questions')
        .update({ section_id: bulkTargetSectionId })
        .in('id', questionIds);

      if (parentErr) throw parentErr;

      // Update all sub-questions of these parents
      const { error: childErr } = await supabase
        .from('questions')
        .update({ section_id: bulkTargetSectionId })
        .in('parent_id', questionIds);

      if (childErr) throw childErr;

      // Refresh list
      const { data: refreshed, error: refreshErr } = await supabase
        .from('questions')
        .select('*')
        .eq('section_id', selectedSectionId)
        .order('created_at', { ascending: true });

      if (refreshErr) throw refreshErr;
      setQuestions((refreshed as unknown as QuestionRow[]) || []);

      // Invalidate questions cache
      queryClient.invalidateQueries({ queryKey: ['questions'] });

      toast.success(`Đã chuyển ${questionIds.length} câu hỏi`);
      setBulkMoveDialogOpen(false);
      setBulkTargetSectionId('');
      setSelectedQuestionIds(new Set());
    } catch (err) {
      console.error('Error bulk moving questions:', err);
      toast.error('Lỗi khi chuyển câu hỏi');
    } finally {
      setBulkMoving(false);
    }
  }, [selectedQuestionIds, bulkTargetSectionId, selectedSectionId, queryClient]);

  // Open edit dialog (câu cha, kèm câu con)
  const openEditDialog = useCallback(async (question: ParentQuestionRow) => {
    // set trước để mở dialog nhanh
    setEditingQuestion(question);
    setEditForm({
      content: question.content,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_option: question.correct_option,
      explanation: question.explanation || '',
      image_url: question.image_url || undefined,
      audio_url: question.audio_url || undefined,
      newSectionId: question.section_id,
      subQuestions: (question.subQuestions ?? []).map((sq) => ({
        id: sq.id,
        content: sq.content,
        option_a: sq.option_a,
        option_b: sq.option_b,
        option_c: sq.option_c,
        option_d: sq.option_d,
        correct_option: sq.correct_option,
        explanation: sq.explanation || '',
      })),
    });

    // Sau đó load lại câu hỏi con theo parent_id để đảm bảo đầy đủ (kể cả dữ liệu cũ bị lệch section)
    try {
      const { data: children, error } = await supabase
        .from('questions')
        .select('*')
        .eq('parent_id', question.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedChildren: QuestionRow[] = (children as unknown as QuestionRow[]) || [];
      setEditingQuestion((prev) => (prev ? { ...prev, subQuestions: mappedChildren } : prev));
      setEditForm((prev) => ({
        ...prev,
        subQuestions: mappedChildren.map((sq) => ({
          id: sq.id,
          content: sq.content,
          option_a: sq.option_a,
          option_b: sq.option_b,
          option_c: sq.option_c,
          option_d: sq.option_d,
          correct_option: sq.correct_option,
          explanation: sq.explanation || '',
        })),
      }));
    } catch (err) {
      console.error('Error loading sub questions:', err);
      // vẫn cho sửa câu cha, nhưng báo lỗi để biết vì sao chưa thấy câu con
      toast.error('Không tải được câu hỏi con. Vui lòng thử lại.');
    }
  }, []);

  // Helper: delete file from storage bucket by URL
  const deleteStorageFile = useCallback(async (publicUrl: string | null | undefined) => {
    if (!publicUrl) return;
    try {
      // Extract path from public URL (after /object/public/question-media/)
      const match = publicUrl.match(/\/object\/public\/question-media\/(.+)$/);
      if (match && match[1]) {
        const filePath = decodeURIComponent(match[1]);
        await supabase.storage.from('question-media').remove([filePath]);
      }
    } catch (err) {
      console.error('Error deleting storage file:', err);
    }
  }, []);

  // Save edited question (câu cha + câu hỏi con nếu có)
  const handleSave = useCallback(async () => {
    if (!editingQuestion) return;

    setSaving(true);
    try {
      const safeExplanation = (editForm.explanation || '').trim().length > 0
        ? sanitizeRichText(editForm.explanation || '')
        : null;

      // Handle media deletion when user removes from form
      const oldImageUrl = editingQuestion.image_url;
      const newImageUrl = editForm.image_url ?? null;
      const oldAudioUrl = editingQuestion.audio_url;
      const newAudioUrl = editForm.audio_url ?? null;

      // Delete old image from storage if removed
      if (oldImageUrl && oldImageUrl !== newImageUrl) {
        await deleteStorageFile(oldImageUrl);
      }
      // Delete old audio from storage if removed
      if (oldAudioUrl && oldAudioUrl !== newAudioUrl) {
        await deleteStorageFile(oldAudioUrl);
      }

      // Determine target section (possibly changed)
      const targetSectionId = editForm.newSectionId || editingQuestion.section_id;

      // 1) Update parent
      const { error: parentErr } = await supabase
        .from('questions')
        .update({
          content: sanitizeRichText(editForm.content || ''),
          option_a: sanitizeRichText(editForm.option_a || ''),
          option_b: sanitizeRichText(editForm.option_b || ''),
          option_c: sanitizeRichText(editForm.option_c || ''),
          option_d: sanitizeRichText(editForm.option_d || ''),
          correct_option: (editForm.correct_option || 'A') as string,
          explanation: safeExplanation,
          image_url: newImageUrl,
          audio_url: newAudioUrl,
          section_id: targetSectionId,
        })
        .eq('id', editingQuestion.id);

      if (parentErr) throw parentErr;

      // 2) Sync sub-questions (if any)
      const nextSubQuestions = editForm.subQuestions ?? [];
      const prevSubQuestions = editingQuestion.subQuestions ?? [];

      const prevIds = new Set(prevSubQuestions.map((sq) => sq.id).filter(Boolean));
      const nextIds = new Set(nextSubQuestions.map((sq) => sq.id).filter(Boolean));

      // Delete removed sub-questions
      const toDelete = Array.from(prevIds).filter((id) => !nextIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('questions')
          .delete()
          .in('id', toDelete)
          .eq('parent_id', editingQuestion.id);
        if (delErr) throw delErr;
      }

      // Update existing / Insert new
      for (const sq of nextSubQuestions) {
        const sqExplanation = (sq.explanation || '').trim().length > 0
          ? sanitizeRichText(sq.explanation)
          : null;

        if (sq.id) {
          const { error: upErr } = await supabase
            .from('questions')
            .update({
              content: sanitizeRichText(sq.content || ''),
              option_a: sanitizeRichText(sq.option_a || ''),
              option_b: sanitizeRichText(sq.option_b || ''),
              option_c: sanitizeRichText(sq.option_c || ''),
              option_d: sanitizeRichText(sq.option_d || ''),
              correct_option: sq.correct_option || 'A',
              explanation: sqExplanation,
            })
            .eq('id', sq.id)
            .eq('parent_id', editingQuestion.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from('questions').insert({
            section_id: targetSectionId,
            parent_id: editingQuestion.id,
            content: sanitizeRichText(sq.content || ''),
            option_a: sanitizeRichText(sq.option_a || ''),
            option_b: sanitizeRichText(sq.option_b || ''),
            option_c: sanitizeRichText(sq.option_c || ''),
            option_d: sanitizeRichText(sq.option_d || ''),
            correct_option: sq.correct_option || 'A',
            explanation: sqExplanation,
          });
          if (insErr) throw insErr;
        }
      }

      // 3) Update sub-questions section_id if section changed
      if (targetSectionId !== editingQuestion.section_id) {
        const { error: updateChildrenErr } = await supabase
          .from('questions')
          .update({ section_id: targetSectionId })
          .eq('parent_id', editingQuestion.id);
        if (updateChildrenErr) throw updateChildrenErr;
      }

      // 4) Refresh list after save - re-fetch current section
      const { data: refreshed, error: refreshErr } = await supabase
        .from('questions')
        .select('*')
        .eq('section_id', selectedSectionId)
        .order('created_at', { ascending: true });

      if (refreshErr) throw refreshErr;
      setQuestions((refreshed as unknown as QuestionRow[]) || []);

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
  }, [editingQuestion, editForm, queryClient, selectedSectionId]);

  // Delete question (xóa cả câu hỏi con & file media)
  const handleDelete = useCallback(async () => {
    if (!deletingQuestion) return;

    setDeleting(true);
    try {
      // Delete media from storage
      if (deletingQuestion.image_url) await deleteStorageFile(deletingQuestion.image_url);
      if (deletingQuestion.audio_url) await deleteStorageFile(deletingQuestion.audio_url);

      // Delete sub-questions first (FK constraint)
      const subQuestions = deletingQuestion.subQuestions ?? [];
      if (subQuestions.length > 0) {
        const childIds = subQuestions.map((sq) => sq.id);
        const { error: childDelErr } = await supabase
          .from('questions')
          .delete()
          .in('id', childIds);
        if (childDelErr) throw childDelErr;
      }

      // Delete parent question
      const { error } = await supabase.from('questions').delete().eq('id', deletingQuestion.id);

      if (error) throw error;

      // Update local state
      setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestion.id && q.parent_id !== deletingQuestion.id));

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
  }, [deletingQuestion, deleteStorageFile, queryClient]);

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

          {/* Bulk action bar */}
          {selectedSectionId && selectedQuestionIds.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  Đã chọn {selectedQuestionIds.size} câu hỏi
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Bỏ chọn
                </Button>
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setBulkMoveDialogOpen(true)}
              >
                <MoveRight className="h-4 w-4" />
                Chuyển mục
              </Button>
            </div>
          )}

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
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Hiển thị {filteredQuestions.length} / {groupedQuestions.length} câu hỏi
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={isAllSelected ? clearSelection : selectAllFiltered}
                    >
                      {isAllSelected ? (
                        <>
                          <Square className="h-3.5 w-3.5" />
                          Bỏ chọn tất cả
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-3.5 w-3.5" />
                          Chọn tất cả ({filteredQuestions.length})
                        </>
                      )}
                    </Button>
                  </div>
                  {filteredQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30 ${
                        selectedQuestionIds.has(q.id) 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border bg-card'
                      }`}
                    >
                      <Checkbox
                        checked={selectedQuestionIds.has(q.id)}
                        onCheckedChange={() => toggleQuestionSelection(q.id)}
                        className="mt-1"
                      />
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
            {(() => {
              const hasSubQuestions = (editForm.subQuestions?.length ?? 0) > 0;

              return (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      {hasSubQuestions ? 'Đề bài (câu tổng)' : 'Nội dung câu hỏi'}
                    </label>
                    <RichTextEditable
                      value={editForm.content || ''}
                      onChange={(v) => setEditForm((prev) => ({ ...prev, content: v }))}
                      placeholder={hasSubQuestions ? 'Nhập đề bài...' : 'Nội dung câu hỏi...'}
                      className="min-h-[80px]"
                    />
                  </div>

                  {hasSubQuestions ? (
                    <SubQuestionInput
                      subQuestions={editForm.subQuestions || []}
                      onChange={(sqs) => setEditForm((prev) => ({ ...prev, subQuestions: sqs }))}
                      disabled={saving}
                    />
                  ) : (
                    <>
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
                    </>
                  )}

                  {/* Media section */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Hình ảnh</label>
                      <MediaUpload
                        type="image"
                        value={editForm.image_url || undefined}
                        onChange={(url) => setEditForm((prev) => ({ ...prev, image_url: url ?? null }))}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Âm thanh</label>
                      <MediaUpload
                        type="audio"
                        value={editForm.audio_url || undefined}
                        onChange={(url) => setEditForm((prev) => ({ ...prev, audio_url: url ?? null }))}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Move to different section */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <ArrowRightLeft className="h-4 w-4" />
                      Chuyển sang mục khác
                    </label>
                    <Select
                      value={editForm.newSectionId || ''}
                      onValueChange={(v) => setEditForm((prev) => ({ ...prev, newSectionId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mục đích" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => {
                          const level = levels.find((l) => l.id === s.level_id);
                          const subject = subjects.find((sub) => sub.id === level?.subject_id);
                          const label = subject && level
                            ? `${subject.name} > ${level.name} > ${s.name}`
                            : level
                            ? `${level.name} > ${s.name}`
                            : s.name;
                          return (
                            <SelectItem key={s.id} value={s.id}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {editForm.newSectionId && editForm.newSectionId !== editingQuestion?.section_id && (
                      <p className="mt-1 text-xs text-warning">
                        ⚠️ Câu hỏi sẽ được chuyển sang mục khác sau khi lưu
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      {hasSubQuestions ? 'Giải thích/ghi chú đề bài (tùy chọn)' : 'Giải thích (tùy chọn)'}
                    </label>
                    <RichTextEditable
                      value={editForm.explanation || ''}
                      onChange={(v) => setEditForm((prev) => ({ ...prev, explanation: v }))}
                      placeholder={hasSubQuestions ? 'Ghi chú cho đề bài...' : 'Giải thích đáp án...'}
                      className="min-h-[60px]"
                    />
                  </div>
                </>
              );
            })()}
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

      {/* Bulk Move Dialog */}
      <Dialog open={bulkMoveDialogOpen} onOpenChange={(open) => !open && setBulkMoveDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chuyển {selectedQuestionIds.size} câu hỏi</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium">Chọn mục đích</label>
            <Select
              value={bulkTargetSectionId}
              onValueChange={setBulkTargetSectionId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn mục đích..." />
              </SelectTrigger>
              <SelectContent>
                {sections
                  .filter((s) => s.id !== selectedSectionId)
                  .map((s) => {
                    const level = levels.find((l) => l.id === s.level_id);
                    const subject = subjects.find((sub) => sub.id === level?.subject_id);
                    const label = subject && level
                      ? `${subject.name} > ${level.name} > ${s.name}`
                      : level
                      ? `${level.name} > ${s.name}`
                      : s.name;
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {label}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkMoveDialogOpen(false);
                setBulkTargetSectionId('');
              }}
              disabled={bulkMoving}
            >
              Hủy
            </Button>
            <Button
              onClick={handleBulkMove}
              disabled={bulkMoving || !bulkTargetSectionId}
              className="gap-2"
            >
              {bulkMoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoveRight className="h-4 w-4" />
              )}
              Chuyển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageQuestionsPage;
