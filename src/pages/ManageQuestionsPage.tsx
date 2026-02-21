/**
 * ManageQuestionsPage - Trang quản lý câu hỏi đã import
 * Hỗ trợ:
 * - Môn có levels/sections (legacy: JLPT)
 * - Môn có layers/categories (dynamic: BJT, etc.)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogIn, Shield, Pencil, Trash2, Search, ChevronDown, Save, X, Image, Volume2, ArrowRightLeft, CheckSquare, Square, MoveRight, Headphones } from 'lucide-react';
import { useRobotsMeta } from '@/hooks/useRobotsMeta';
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
import { ListeningExamManager } from '@/components/admin/ListeningExamManager';

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
  order_index?: number;
}

interface Section {
  id: string;
  name: string;
  slug: string;
  level_id: string;
  order_index?: number;
}

interface SubjectLayer {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  order_index: number;
  required: boolean;
}

interface CategoryRow {
  id: string;
  subject_id: string;
  layer_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  order_index: number | null;
  allow_random: boolean;
  allow_count_selection: boolean;
  fixed_exam_mode: boolean;
}

// Loại câu hỏi nghe theo format JLPT
type ListeningQuestionType = 'standard' | 'audio_only' | 'image_based';

interface QuestionRow {
  id: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  explanation: string | null;
  section_id: string | null;
  category_id: string | null;
  created_at: string;
  parent_id?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  question_type?: ListeningQuestionType | null;
  option_count?: number | null;
}

interface ParentQuestionRow extends QuestionRow {
  subQuestions?: QuestionRow[];
}

type EditQuestionForm = Partial<QuestionRow> & { 
  subQuestions?: SubQuestion[]; 
  newTargetId?: string;
  newTargetType?: 'section' | 'category';
  question_type?: ListeningQuestionType;
  option_count?: number;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Helper to sort sections hierarchically: Subject name → Level order_index → Section order_index
function getSortedSectionsWithLabels(
  sections: Section[],
  levels: Level[],
  subjects: Subject[],
  excludeSectionId?: string
) {
  return sections
    .filter((s) => !excludeSectionId || s.id !== excludeSectionId)
    .map((s) => {
      const level = levels.find((l) => l.id === s.level_id);
      const subject = subjects.find((sub) => sub.id === level?.subject_id);
      const label = subject && level
        ? `${subject.name} > ${level.name} > ${s.name}`
        : level
        ? `${level.name} > ${s.name}`
        : s.name;
      return {
        ...s,
        label,
        subjectName: subject?.name || '',
        levelOrderIndex: level?.order_index ?? 999,
        sectionOrderIndex: s.order_index ?? 999,
      };
    })
    .sort((a, b) => {
      const subjectCompare = a.subjectName.localeCompare(b.subjectName, 'vi');
      if (subjectCompare !== 0) return subjectCompare;
      if (a.levelOrderIndex !== b.levelOrderIndex) return a.levelOrderIndex - b.levelOrderIndex;
      return a.sectionOrderIndex - b.sectionOrderIndex;
    });
}

// Helper to get leaf categories with full path labels
function getLeafCategoriesWithLabels(
  allCategories: CategoryRow[],
  subjects: Subject[],
  excludeCategoryId?: string
) {
  // Leaf = categories that have no children
  const leafCategories = allCategories.filter(cat => {
    const hasChildren = allCategories.some(other => other.parent_id === cat.id);
    return !hasChildren && (!excludeCategoryId || cat.id !== excludeCategoryId);
  });

  return leafCategories.map(cat => {
    const path: string[] = [cat.name];
    let current = cat;
    while (current.parent_id) {
      const parent = allCategories.find(c => c.id === current.parent_id);
      if (parent) { path.unshift(parent.name); current = parent; }
      else break;
    }
    const subject = subjects.find(s => s.id === cat.subject_id);
    return {
      ...cat,
      label: subject ? `${subject.name} > ${path.join(' > ')}` : path.join(' > '),
    };
  }).sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

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

  childrenByParent.forEach((list, key) => {
    childrenByParent.set(
      key,
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    );
  });

  return parents.map((p) => ({ ...p, subQuestions: childrenByParent.get(p.id) ?? [] }));
}

const ManageQuestionsPage = () => {
  useRobotsMeta('noindex, nofollow');
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjectLayers, setSubjectLayers] = useState<SubjectLayer[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  // Dynamic layer selections: layerIndex → categoryId
  const [selectedCategoryPerLayer, setSelectedCategoryPerLayer] = useState<Record<number, string>>({});
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
  const [bulkTargetId, setBulkTargetId] = useState<string>('');
  const [bulkMoving, setBulkMoving] = useState(false);

  // === Computed values ===

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectHasLevels = selectedSubject?.has_levels ?? true;

  // Dynamic layers for current subject
  const currentLayers = useMemo(
    () => subjectLayers.filter(l => l.subject_id === selectedSubjectId).sort((a, b) => a.order_index - b.order_index),
    [subjectLayers, selectedSubjectId]
  );
  const usesLayers = currentLayers.length > 0;

  // Categories for each layer dropdown
  const categoriesForLayer = useMemo(() => {
    if (!usesLayers) return [];
    return currentLayers.map((layer, idx) => {
      const parentCatId = idx > 0 ? selectedCategoryPerLayer[idx - 1] : undefined;
      if (idx > 0 && !parentCatId) return [];
      return allCategories.filter(c => {
        if (c.layer_id !== layer.id) return false;
        if (idx === 0) return c.parent_id === null;
        return c.parent_id === (parentCatId || null);
      });
    });
  }, [currentLayers, allCategories, selectedCategoryPerLayer, usesLayers]);

  // The effective leaf category for loading questions
  const effectiveCategoryId = useMemo(() => {
    if (!usesLayers) return '';
    for (let i = currentLayers.length - 1; i >= 0; i--) {
      const catId = selectedCategoryPerLayer[i];
      if (catId) {
        // Check if this category has children in next layer
        if (i < currentLayers.length - 1) {
          const nextLayer = currentLayers[i + 1];
          const children = allCategories.filter(c => c.layer_id === nextLayer.id && c.parent_id === catId);
          if (children.length > 0) return ''; // has children, need to select deeper
        }
        return catId;
      }
    }
    return '';
  }, [currentLayers, selectedCategoryPerLayer, allCategories, usesLayers]);

  // Unified active filter
  const activeFilterColumn = usesLayers ? 'category_id' : 'section_id';
  const activeFilterValue = usesLayers ? effectiveCategoryId : selectedSectionId;

  // Filter levels and sections (legacy)
  const filteredLevels = levels.filter((l) => l.subject_id === selectedSubjectId);
  const filteredSections = subjectHasLevels
    ? sections.filter((s) => s.level_id === selectedLevelId)
    : sections.filter((s) => {
        const level = levels.find((l) => l.id === s.level_id);
        return level?.subject_id === selectedSubjectId;
      });

  // === Data loading ===

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsRes, levelsRes, sectionsRes, layersRes, categoriesRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('levels').select('*').order('order_index'),
          supabase.from('sections').select('*').order('order_index'),
          supabase.from('subject_layers').select('*').order('order_index'),
          supabase.from('categories').select('*').order('order_index'),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (levelsRes.error) throw levelsRes.error;
        if (sectionsRes.error) throw sectionsRes.error;
        if (layersRes.error) throw layersRes.error;
        if (categoriesRes.error) throw categoriesRes.error;

        setSubjects(subjectsRes.data || []);
        setLevels(levelsRes.data || []);
        setSections(sectionsRes.data || []);
        setSubjectLayers(layersRes.data || []);
        setAllCategories((categoriesRes.data || []) as CategoryRow[]);
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
    setSelectedCategoryPerLayer({});
    setQuestions([]);
    setSelectedQuestionIds(new Set());
  }, [selectedSubjectId]);

  useEffect(() => {
    setSelectedSectionId('');
    setQuestions([]);
    setSelectedQuestionIds(new Set());
  }, [selectedLevelId]);

  // Handle category selection change (clear deeper selections)
  const handleCategoryChange = useCallback((layerIdx: number, categoryId: string) => {
    setSelectedCategoryPerLayer(prev => {
      const next: Record<number, string> = {};
      for (let i = 0; i < layerIdx; i++) {
        if (prev[i]) next[i] = prev[i];
      }
      if (categoryId) next[layerIdx] = categoryId;
      return next;
    });
    setQuestions([]);
    setSelectedQuestionIds(new Set());
  }, []);

  // Load questions when active filter changes
  useEffect(() => {
    if (!activeFilterValue) {
      setQuestions([]);
      setSelectedQuestionIds(new Set());
      return;
    }

    const loadQuestions = async () => {
      setLoadingQuestions(true);
      setSelectedQuestionIds(new Set());
      try {
        let query = supabase.from('questions').select('*');
        if (activeFilterColumn === 'category_id') {
          query = query.eq('category_id', activeFilterValue);
        } else {
          query = query.eq('section_id', activeFilterValue);
        }
        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw error;
        setQuestions((data as unknown as QuestionRow[]) || []);
      } catch (err) {
        console.error('Error loading questions:', err);
        toast.error('Lỗi khi tải câu hỏi');
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [activeFilterColumn, activeFilterValue]);

  const groupedQuestions = useMemo(() => groupQuestionsWithChildren(questions), [questions]);

  // Detect if this section/category is a listening section or driving exam section
  const isListeningSection = useMemo(() => {
    return questions.some(q => q.audio_url && !q.parent_id && !q.audio_url.startsWith('driving-exam-'));
  }, [questions]);

  const isDrivingExamSection = useMemo(() => {
    return questions.some(q => q.audio_url && !q.parent_id && q.audio_url.startsWith('driving-exam-'));
  }, [questions]);

  const reloadQuestions = useCallback(async () => {
    if (!activeFilterValue) return;
    let query = supabase.from('questions').select('*');
    if (activeFilterColumn === 'category_id') {
      query = query.eq('category_id', activeFilterValue);
    } else {
      query = query.eq('section_id', activeFilterValue);
    }
    const { data, error } = await query.order('created_at', { ascending: true });
    if (!error) {
      setQuestions((data as unknown as QuestionRow[]) || []);
    }
    queryClient.invalidateQueries({ queryKey: ['questions'] });
    queryClient.invalidateQueries({ queryKey: ['listening-exams'] });
  }, [activeFilterColumn, activeFilterValue, queryClient]);

  // Filter questions by search
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

  // Build relocation targets (same type as current filter)
  const relocationTargets = useMemo(() => {
    if (usesLayers) {
      return getLeafCategoriesWithLabels(allCategories, subjects, activeFilterValue || undefined)
        .map(c => ({ id: c.id, label: c.label, type: 'category' as const }));
    }
    return getSortedSectionsWithLabels(sections, levels, subjects, activeFilterValue || undefined)
      .map(s => ({ id: s.id, label: s.label, type: 'section' as const }));
  }, [usesLayers, allCategories, sections, levels, subjects, activeFilterValue]);

  // Bulk move handler
  const handleBulkMove = useCallback(async () => {
    if (selectedQuestionIds.size === 0 || !bulkTargetId) return;

    setBulkMoving(true);
    try {
      const questionIds = Array.from(selectedQuestionIds);
      const target = relocationTargets.find(t => t.id === bulkTargetId);
      if (!target) throw new Error('Target not found');

      const updateCol = target.type === 'category' ? 'category_id' : 'section_id';

      // Update parent questions
      const { error: parentErr } = await supabase
        .from('questions')
        .update({ [updateCol]: bulkTargetId } as any)
        .in('id', questionIds);
      if (parentErr) throw parentErr;

      // Update all sub-questions of these parents
      const { error: childErr } = await supabase
        .from('questions')
        .update({ [updateCol]: bulkTargetId } as any)
        .in('parent_id', questionIds);
      if (childErr) throw childErr;

      // Refresh list
      await reloadQuestions();

      toast.success(`Đã chuyển ${questionIds.length} câu hỏi`);
      setBulkMoveDialogOpen(false);
      setBulkTargetId('');
      setSelectedQuestionIds(new Set());
    } catch (err) {
      console.error('Error bulk moving questions:', err);
      toast.error('Lỗi khi chuyển câu hỏi');
    } finally {
      setBulkMoving(false);
    }
  }, [selectedQuestionIds, bulkTargetId, relocationTargets, reloadQuestions]);

  // Open edit dialog
  const openEditDialog = useCallback(async (question: ParentQuestionRow) => {
    setEditingQuestion(question);
    const currentTargetId = usesLayers ? (question.category_id || '') : (question.section_id || '');
    const currentTargetType = usesLayers ? 'category' : 'section';
    setEditForm({
      content: question.content,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c || '',
      option_d: question.option_d || '',
      correct_option: question.correct_option,
      explanation: question.explanation || '',
      image_url: question.image_url || undefined,
      audio_url: question.audio_url || undefined,
      newTargetId: currentTargetId,
      newTargetType: currentTargetType,
      question_type: question.question_type || 'standard',
      option_count: question.option_count || 4,
      subQuestions: (question.subQuestions ?? []).map((sq) => ({
        id: sq.id,
        content: sq.content,
        option_a: sq.option_a,
        option_b: sq.option_b,
        option_c: sq.option_c || '',
        option_d: sq.option_d || '',
        correct_option: sq.correct_option,
        explanation: sq.explanation || '',
        question_type: sq.question_type || 'standard',
        option_count: sq.option_count || 4,
      })),
    });

    // Reload sub-questions from DB to ensure completeness
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
          option_c: sq.option_c || '',
          option_d: sq.option_d || '',
          correct_option: sq.correct_option,
          explanation: sq.explanation || '',
          question_type: sq.question_type || 'standard',
          option_count: sq.option_count || 4,
        })),
      }));
    } catch (err) {
      console.error('Error loading sub questions:', err);
      toast.error('Không tải được câu hỏi con. Vui lòng thử lại.');
    }
  }, [usesLayers]);

  // Helper: delete file from storage bucket by URL
  const deleteStorageFile = useCallback(async (publicUrl: string | null | undefined) => {
    if (!publicUrl) return;
    try {
      const match = publicUrl.match(/\/object\/public\/question-media\/(.+)$/);
      if (match && match[1]) {
        const filePath = decodeURIComponent(match[1]);
        await supabase.storage.from('question-media').remove([filePath]);
      }
    } catch (err) {
      console.error('Error deleting storage file:', err);
    }
  }, []);

  // Save edited question
  const handleSave = useCallback(async () => {
    if (!editingQuestion) return;

    setSaving(true);
    try {
      const safeExplanation = (editForm.explanation || '').trim().length > 0
        ? sanitizeRichText(editForm.explanation || '')
        : null;

      // Handle media deletion
      const oldImageUrl = editingQuestion.image_url;
      const newImageUrl = editForm.image_url ?? null;
      const oldAudioUrl = editingQuestion.audio_url;
      const newAudioUrl = editForm.audio_url ?? null;

      if (oldImageUrl && oldImageUrl !== newImageUrl) await deleteStorageFile(oldImageUrl);
      if (oldAudioUrl && oldAudioUrl !== newAudioUrl) await deleteStorageFile(oldAudioUrl);

      // Determine target
      const newTargetId = editForm.newTargetId || activeFilterValue;
      const newTargetType = editForm.newTargetType || (usesLayers ? 'category' : 'section');
      const targetCol = newTargetType === 'category' ? 'category_id' : 'section_id';

      const optionCount = editForm.option_count || 4;
      const optionC = optionCount >= 3 ? sanitizeRichText(editForm.option_c || '') : null;
      const optionD = optionCount >= 4 ? sanitizeRichText(editForm.option_d || '') : null;

      // 1) Update parent
      const { error: parentErr } = await supabase
        .from('questions')
        .update({
          content: sanitizeRichText(editForm.content || ''),
          option_a: sanitizeRichText(editForm.option_a || ''),
          option_b: sanitizeRichText(editForm.option_b || ''),
          option_c: optionC,
          option_d: optionD,
          correct_option: (editForm.correct_option || 'A') as string,
          explanation: safeExplanation,
          image_url: newImageUrl,
          audio_url: newAudioUrl,
          [targetCol]: newTargetId,
          question_type: editForm.question_type || 'standard',
          option_count: optionCount,
        } as any)
        .eq('id', editingQuestion.id);

      if (parentErr) throw parentErr;

      // 2) Sync sub-questions
      const nextSubQuestions = editForm.subQuestions ?? [];
      const prevSubQuestions = editingQuestion.subQuestions ?? [];

      const prevIds = new Set(prevSubQuestions.map((sq) => sq.id).filter(Boolean));
      const nextIds = new Set(nextSubQuestions.map((sq) => sq.id).filter(Boolean));

      const toDelete = Array.from(prevIds).filter((id) => !nextIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('questions')
          .delete()
          .in('id', toDelete)
          .eq('parent_id', editingQuestion.id);
        if (delErr) throw delErr;
      }

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
          const insertData: Record<string, any> = {
            parent_id: editingQuestion.id,
            content: sanitizeRichText(sq.content || ''),
            option_a: sanitizeRichText(sq.option_a || ''),
            option_b: sanitizeRichText(sq.option_b || ''),
            option_c: sanitizeRichText(sq.option_c || ''),
            option_d: sanitizeRichText(sq.option_d || ''),
            correct_option: sq.correct_option || 'A',
            explanation: sqExplanation,
            [targetCol]: newTargetId,
          };
          const { error: insErr } = await supabase.from('questions').insert(insertData as any);
          if (insErr) throw insErr;
        }
      }

      // 3) Update sub-questions target if changed
      const oldTargetId = usesLayers ? editingQuestion.category_id : editingQuestion.section_id;
      if (newTargetId !== oldTargetId) {
        const { error: updateChildrenErr } = await supabase
          .from('questions')
          .update({ [targetCol]: newTargetId } as any)
          .eq('parent_id', editingQuestion.id);
        if (updateChildrenErr) throw updateChildrenErr;
      }

      // 4) Refresh
      await reloadQuestions();

      toast.success('Đã lưu câu hỏi');
      setEditingQuestion(null);
    } catch (err) {
      console.error('Error saving question:', err);
      toast.error('Lỗi khi lưu câu hỏi');
    } finally {
      setSaving(false);
    }
  }, [editingQuestion, editForm, queryClient, activeFilterColumn, activeFilterValue, usesLayers, reloadQuestions, deleteStorageFile]);

  // Delete question
  const handleDelete = useCallback(async () => {
    if (!deletingQuestion) return;

    setDeleting(true);
    try {
      if (deletingQuestion.image_url) await deleteStorageFile(deletingQuestion.image_url);
      if (deletingQuestion.audio_url) await deleteStorageFile(deletingQuestion.audio_url);

      const subQuestions = deletingQuestion.subQuestions ?? [];
      if (subQuestions.length > 0) {
        const childIds = subQuestions.map((sq) => sq.id);
        const { error: childDelErr } = await supabase
          .from('questions')
          .delete()
          .in('id', childIds);
        if (childDelErr) throw childDelErr;
      }

      const { error } = await supabase.from('questions').delete().eq('id', deletingQuestion.id);
      if (error) throw error;

      setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestion.id && q.parent_id !== deletingQuestion.id));
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

            {/* Dynamic Layer dropdowns (for layer-based subjects) */}
            {selectedSubjectId && usesLayers && currentLayers.map((layer, idx) => {
              // Only show if previous layer is selected (or first layer)
              if (idx > 0 && !selectedCategoryPerLayer[idx - 1]) return null;
              const layerCats = categoriesForLayer[idx] || [];
              // Skip empty layers that aren't first
              if (layerCats.length === 0 && idx > 0) return null;

              return (
                <div key={layer.id}>
                  <label className="mb-1 block text-sm font-medium text-foreground">{layer.name}</label>
                  <Select
                    value={selectedCategoryPerLayer[idx] || ''}
                    onValueChange={(v) => handleCategoryChange(idx, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Chọn ${layer.name.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {layerCats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon ? `${c.icon} ` : ''}{c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}

            {/* Legacy Level (for level-based subjects) */}
            {selectedSubjectId && !usesLayers && subjectHasLevels && (
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

            {/* Legacy Section */}
            {selectedSubjectId && !usesLayers && ((subjectHasLevels && selectedLevelId) || !subjectHasLevels) && (
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
            {activeFilterValue && (
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
          {activeFilterValue && selectedQuestionIds.size > 0 && (
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
          {activeFilterValue && (
            <div className="space-y-3">
              {loadingQuestions ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isListeningSection ? (
                <ListeningExamManager
                  questions={questions}
                  onQuestionsChanged={reloadQuestions}
                  onEditQuestion={openEditDialog}
                />
              ) : isDrivingExamSection ? (
                <ListeningExamManager
                  questions={questions}
                  onQuestionsChanged={reloadQuestions}
                  onEditQuestion={openEditDialog}
                  variant="driving"
                />
              ) : filteredQuestions.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Không tìm thấy câu hỏi phù hợp' : 'Chưa có câu hỏi nào'}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[40px_48px_1fr_auto] gap-3 bg-muted/50 px-4 py-3 border-b border-border items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={isAllSelected ? clearSelection : selectAllFiltered}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">#</span>
                    <span className="text-sm font-medium text-muted-foreground">Nội dung câu hỏi</span>
                    <span className="text-sm font-medium text-muted-foreground">Thao tác</span>
                  </div>

                  {/* Table info bar */}
                  <div className="px-4 py-2 bg-muted/20 border-b border-border">
                    <p className="text-sm text-muted-foreground">
                      Hiển thị {filteredQuestions.length} / {groupedQuestions.length} câu hỏi
                    </p>
                  </div>

                  {/* Table rows */}
                  <div className="divide-y divide-border">
                  {filteredQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className={`grid grid-cols-[40px_48px_1fr_auto] gap-3 px-4 py-4 items-start transition-colors hover:bg-muted/30 ${
                        selectedQuestionIds.has(q.id) 
                          ? 'bg-primary/5' 
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedQuestionIds.has(q.id)}
                          onCheckedChange={() => toggleQuestionSelection(q.id)}
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="mb-2 text-sm font-medium text-foreground"
                          dangerouslySetInnerHTML={{ __html: q.content || '<em class="text-muted-foreground">Câu hỏi trong audio</em>' }}
                        />
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {q.question_type && q.question_type !== 'standard' && (
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                              {q.question_type === 'audio_only' ? '🎧 Audio Only' : '🖼️ Image Based'}
                            </span>
                          )}
                          <span className={q.correct_option === 'A' ? 'text-success font-medium' : ''}>
                            ①: <span dangerouslySetInnerHTML={{ __html: q.option_a || '—' }} />
                          </span>
                          <span className={q.correct_option === 'B' ? 'text-success font-medium' : ''}>
                            ②: <span dangerouslySetInnerHTML={{ __html: q.option_b || '—' }} />
                          </span>
                          {(q.option_count ?? 4) >= 3 && (
                            <span className={q.correct_option === 'C' ? 'text-success font-medium' : ''}>
                              ③: <span dangerouslySetInnerHTML={{ __html: q.option_c || '—' }} />
                            </span>
                          )}
                          {(q.option_count ?? 4) >= 4 && (
                            <span className={q.correct_option === 'D' ? 'text-success font-medium' : ''}>
                              ④: <span dangerouslySetInnerHTML={{ __html: q.option_d || '—' }} />
                            </span>
                          )}
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
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeFilterValue && (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <ChevronDown className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                {usesLayers
                  ? `Chọn môn học và ${currentLayers.map(l => l.name.toLowerCase()).join(', ')} để xem câu hỏi`
                  : 'Chọn môn học, cấp độ và phần để xem câu hỏi'}
              </p>
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

                  {/* Question type settings */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                    <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                      🎧 Cài đặt loại câu hỏi (cho phần nghe)
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Loại câu hỏi</label>
                        <Select
                          value={editForm.question_type || 'standard'}
                          onValueChange={(v) => setEditForm((prev) => ({ ...prev, question_type: v as ListeningQuestionType }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard (đầy đủ text)</SelectItem>
                            <SelectItem value="audio_only">Audio Only (chỉ ①②③④)</SelectItem>
                            <SelectItem value="image_based">Image Based (chọn theo hình)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Số lượng đáp án</label>
                        <Select
                          value={String(editForm.option_count || 4)}
                          onValueChange={(v) => setEditForm((prev) => ({ ...prev, option_count: parseInt(v, 10) }))}
                        >
                          <SelectTrigger>
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
                    <p className="text-xs text-muted-foreground">
                      <strong>Standard:</strong> Hiển thị câu hỏi + đáp án text •{' '}
                      <strong>Audio Only:</strong> Câu hỏi/đáp án trong audio, chỉ hiển thị ①②③④ •{' '}
                      <strong>Image Based:</strong> Chọn đáp án theo hình
                    </p>
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
                          <label className="mb-1 block text-sm font-medium">Đáp án A (①)</label>
                          <RichTextEditable
                            value={editForm.option_a || ''}
                            onChange={(v) => setEditForm((prev) => ({ ...prev, option_a: v }))}
                            placeholder={editForm.question_type === 'audio_only' ? '(Để trống nếu trong audio)' : 'Đáp án A'}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Đáp án B (②)</label>
                          <RichTextEditable
                            value={editForm.option_b || ''}
                            onChange={(v) => setEditForm((prev) => ({ ...prev, option_b: v }))}
                            placeholder={editForm.question_type === 'audio_only' ? '(Để trống nếu trong audio)' : 'Đáp án B'}
                          />
                        </div>
                        {(editForm.option_count || 4) >= 3 && (
                          <div>
                            <label className="mb-1 block text-sm font-medium">Đáp án C (③)</label>
                            <RichTextEditable
                              value={editForm.option_c || ''}
                              onChange={(v) => setEditForm((prev) => ({ ...prev, option_c: v }))}
                              placeholder={editForm.question_type === 'audio_only' ? '(Để trống nếu trong audio)' : 'Đáp án C'}
                            />
                          </div>
                        )}
                        {(editForm.option_count || 4) >= 4 && (
                          <div>
                            <label className="mb-1 block text-sm font-medium">Đáp án D (④)</label>
                            <RichTextEditable
                              value={editForm.option_d || ''}
                              onChange={(v) => setEditForm((prev) => ({ ...prev, option_d: v }))}
                              placeholder={editForm.question_type === 'audio_only' ? '(Để trống nếu trong audio)' : 'Đáp án D'}
                            />
                          </div>
                        )}
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
                            <SelectItem value="A">① A</SelectItem>
                            <SelectItem value="B">② B</SelectItem>
                            {(editForm.option_count || 4) >= 3 && (
                              <SelectItem value="C">③ C</SelectItem>
                            )}
                            {(editForm.option_count || 4) >= 4 && (
                              <SelectItem value="D">④ D</SelectItem>
                            )}
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

                  {/* Move to different target */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <ArrowRightLeft className="h-4 w-4" />
                      Chuyển sang mục khác
                    </label>
                    <Select
                      value={editForm.newTargetId || ''}
                      onValueChange={(v) => {
                        const target = relocationTargets.find(t => t.id === v);
                        setEditForm((prev) => ({
                          ...prev,
                          newTargetId: v,
                          newTargetType: target?.type || (usesLayers ? 'category' : 'section'),
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mục đích" />
                      </SelectTrigger>
                      <SelectContent>
                        {relocationTargets.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editForm.newTargetId && editForm.newTargetId !== activeFilterValue && (
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
              value={bulkTargetId}
              onValueChange={setBulkTargetId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn mục đích..." />
              </SelectTrigger>
              <SelectContent>
                {relocationTargets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkMoveDialogOpen(false);
                setBulkTargetId('');
              }}
              disabled={bulkMoving}
            >
              Hủy
            </Button>
            <Button
              onClick={handleBulkMove}
              disabled={bulkMoving || !bulkTargetId}
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
