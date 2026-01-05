/**
 * ManageSubjectsPage - Trang quản lý môn học, cấp độ, phần luyện thi
 * Chỉ admin mới có quyền truy cập
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  X,
  LogIn,
  Shield,
  BookOpen,
  Layers,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { EditDialog } from '@/components/admin/EditDialog';
import { DeleteDialog } from '@/components/admin/DeleteDialog';

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
  order_index: number | null;
}

interface Section {
  id: string;
  name: string;
  slug: string;
  level_id: string;
  description: string | null;
  order_index: number | null;
}

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const ManageSubjectsPage = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded subjects for tree view
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  // Adding new items
  const [addingSubject, setAddingSubject] = useState(false);
  const [addingLevelForSubject, setAddingLevelForSubject] = useState<string | null>(null);
  const [addingSectionForLevel, setAddingSectionForLevel] = useState<string | null>(null);

  // Form states
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newSubjectHasLevels, setNewSubjectHasLevels] = useState(true);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelDesc, setNewLevelDesc] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  const [savingSubject, setSavingSubject] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);
  const [savingSection, setSavingSection] = useState(false);

  // Edit states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete states
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data
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
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Toggle expand
  const toggleSubject = (id: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSubjects(newSet);
  };

  const toggleLevel = (id: string) => {
    const newSet = new Set(expandedLevels);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedLevels(newSet);
  };

  // Create subject
  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error('Vui lòng nhập tên môn học');
      return;
    }

    setSavingSubject(true);
    try {
      const slug = createSlug(newSubjectName);
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: newSubjectName.trim(),
          slug,
          description: newSubjectDesc.trim() || null,
          has_levels: newSubjectHasLevels,
        })
        .select()
        .single();

      if (error) throw error;

      setSubjects([...subjects, data]);
      setNewSubjectName('');
      setNewSubjectDesc('');
      setNewSubjectHasLevels(true);
      setAddingSubject(false);
      toast.success('Đã tạo môn học mới');

      // Auto expand the new subject
      setExpandedSubjects(new Set([...expandedSubjects, data.id]));
    } catch (err: any) {
      console.error('Error creating subject:', err);
      toast.error(err.message || 'Lỗi khi tạo môn học');
    } finally {
      setSavingSubject(false);
    }
  };

  // Create level
  const handleCreateLevel = async (subjectId: string) => {
    if (!newLevelName.trim()) {
      toast.error('Vui lòng nhập tên cấp độ');
      return;
    }

    setSavingLevel(true);
    try {
      const slug = createSlug(newLevelName);
      const subjectLevels = levels.filter((l) => l.subject_id === subjectId);
      const orderIndex = subjectLevels.length;

      const { data, error } = await supabase
        .from('levels')
        .insert({
          name: newLevelName.trim(),
          slug,
          subject_id: subjectId,
          description: newLevelDesc.trim() || null,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      setLevels([...levels, data]);
      setNewLevelName('');
      setNewLevelDesc('');
      setAddingLevelForSubject(null);
      toast.success('Đã tạo cấp độ mới');

      // Auto expand the new level
      setExpandedLevels(new Set([...expandedLevels, data.id]));
    } catch (err: any) {
      console.error('Error creating level:', err);
      toast.error(err.message || 'Lỗi khi tạo cấp độ');
    } finally {
      setSavingLevel(false);
    }
  };

  // Create section
  const handleCreateSection = async (levelId: string) => {
    if (!newSectionName.trim()) {
      toast.error('Vui lòng nhập tên phần');
      return;
    }

    setSavingSection(true);
    try {
      const slug = createSlug(newSectionName);
      const levelSections = sections.filter((s) => s.level_id === levelId);
      const orderIndex = levelSections.length;

      const { data, error } = await supabase
        .from('sections')
        .insert({
          name: newSectionName.trim(),
          slug,
          level_id: levelId,
          description: newSectionDesc.trim() || null,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      setSections([...sections, data]);
      setNewSectionName('');
      setNewSectionDesc('');
      setAddingSectionForLevel(null);
      toast.success('Đã tạo phần mới');
    } catch (err: any) {
      console.error('Error creating section:', err);
      toast.error(err.message || 'Lỗi khi tạo phần');
    } finally {
      setSavingSection(false);
    }
  };

  // Edit subject
  const handleEditSubject = async (name: string, description: string, hasLevels?: boolean) => {
    if (!editingSubject) return;

    setSavingEdit(true);
    try {
      const slug = createSlug(name);
      const { error } = await supabase
        .from('subjects')
        .update({
          name: name.trim(),
          slug,
          description: description.trim() || null,
          has_levels: hasLevels ?? editingSubject.has_levels,
        })
        .eq('id', editingSubject.id);

      if (error) throw error;

      setSubjects(
        subjects.map((s) =>
          s.id === editingSubject.id
            ? { ...s, name: name.trim(), slug, description: description.trim() || null, has_levels: hasLevels ?? s.has_levels }
            : s
        )
      );
      setEditingSubject(null);
      toast.success('Đã cập nhật môn học');
    } catch (err: any) {
      console.error('Error updating subject:', err);
      toast.error(err.message || 'Lỗi khi cập nhật môn học');
    } finally {
      setSavingEdit(false);
    }
  };

  // Edit level
  const handleEditLevel = async (name: string, description: string) => {
    if (!editingLevel) return;

    setSavingEdit(true);
    try {
      const slug = createSlug(name);
      const { error } = await supabase
        .from('levels')
        .update({
          name: name.trim(),
          slug,
          description: description.trim() || null,
        })
        .eq('id', editingLevel.id);

      if (error) throw error;

      setLevels(
        levels.map((l) =>
          l.id === editingLevel.id
            ? { ...l, name: name.trim(), slug, description: description.trim() || null }
            : l
        )
      );
      setEditingLevel(null);
      toast.success('Đã cập nhật cấp độ');
    } catch (err: any) {
      console.error('Error updating level:', err);
      toast.error(err.message || 'Lỗi khi cập nhật cấp độ');
    } finally {
      setSavingEdit(false);
    }
  };

  // Edit section
  const handleEditSection = async (name: string, description: string) => {
    if (!editingSection) return;

    setSavingEdit(true);
    try {
      const slug = createSlug(name);
      const { error } = await supabase
        .from('sections')
        .update({
          name: name.trim(),
          slug,
          description: description.trim() || null,
        })
        .eq('id', editingSection.id);

      if (error) throw error;

      setSections(
        sections.map((s) =>
          s.id === editingSection.id
            ? { ...s, name: name.trim(), slug, description: description.trim() || null }
            : s
        )
      );
      setEditingSection(null);
      toast.success('Đã cập nhật phần');
    } catch (err: any) {
      console.error('Error updating section:', err);
      toast.error(err.message || 'Lỗi khi cập nhật phần');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete subject
  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', deletingSubject.id);

      if (error) throw error;

      // Also remove related levels and sections from state
      const subjectLevelIds = levels.filter((l) => l.subject_id === deletingSubject.id).map((l) => l.id);
      setSubjects(subjects.filter((s) => s.id !== deletingSubject.id));
      setLevels(levels.filter((l) => l.subject_id !== deletingSubject.id));
      setSections(sections.filter((s) => !subjectLevelIds.includes(s.level_id)));
      setDeletingSubject(null);
      toast.success('Đã xóa môn học');
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      toast.error(err.message || 'Lỗi khi xóa môn học');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete level
  const handleDeleteLevel = async () => {
    if (!deletingLevel) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('levels').delete().eq('id', deletingLevel.id);

      if (error) throw error;

      setLevels(levels.filter((l) => l.id !== deletingLevel.id));
      setSections(sections.filter((s) => s.level_id !== deletingLevel.id));
      setDeletingLevel(null);
      toast.success('Đã xóa cấp độ');
    } catch (err: any) {
      console.error('Error deleting level:', err);
      toast.error(err.message || 'Lỗi khi xóa cấp độ');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete section
  const handleDeleteSection = async () => {
    if (!deletingSection) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('sections').delete().eq('id', deletingSection.id);

      if (error) throw error;

      setSections(sections.filter((s) => s.id !== deletingSection.id));
      setDeletingSection(null);
      toast.success('Đã xóa phần');
    } catch (err: any) {
      console.error('Error deleting section:', err);
      toast.error(err.message || 'Lỗi khi xóa phần');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get levels for a subject
  const getLevelsForSubject = (subjectId: string) => {
    return levels.filter((l) => l.subject_id === subjectId);
  };

  // Get sections for a level
  const getSectionsForLevel = (levelId: string) => {
    return sections.filter((s) => s.level_id === levelId);
  };

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
              Bạn cần đăng nhập với tài khoản admin để quản lý môn học
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
            <p className="mb-6 text-muted-foreground">Chỉ admin mới có thể quản lý môn học.</p>
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
            items={[{ label: 'Trang chủ', href: '/' }, { label: 'Quản lý môn học' }]}
          />
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Quản lý môn học</h1>
              <p className="text-muted-foreground">
                Thêm, sửa, xóa môn học, cấp độ, phần luyện thi
              </p>
            </div>
            <Button onClick={() => setAddingSubject(true)} className="gap-2" disabled={addingSubject}>
              <Plus className="h-4 w-4" />
              Thêm môn học
            </Button>
          </div>

          {/* Add new subject form */}
          {addingSubject && (
            <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Thêm môn học mới</h2>
                <button
                  onClick={() => setAddingSubject(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Tên môn học (VD: Tiếng Nhật)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  disabled={savingSubject}
                />
                <Input
                  placeholder="Mô tả (tùy chọn)"
                  value={newSubjectDesc}
                  onChange={(e) => setNewSubjectDesc(e.target.value)}
                  disabled={savingSubject}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="has-levels"
                    checked={newSubjectHasLevels}
                    onCheckedChange={(checked) => setNewSubjectHasLevels(!!checked)}
                    disabled={savingSubject}
                  />
                  <label htmlFor="has-levels" className="text-sm text-muted-foreground">
                    Có phân chia cấp độ (VD: N5, N4, N3...)
                  </label>
                </div>
                <Button onClick={handleCreateSubject} disabled={savingSubject} className="w-full">
                  {savingSubject ? 'Đang tạo...' : 'Tạo môn học'}
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="py-12 text-center text-muted-foreground">Đang tải dữ liệu...</div>
          )}

          {/* No subjects */}
          {!loading && subjects.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Chưa có môn học nào</p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => setAddingSubject(true)}
              >
                <Plus className="h-4 w-4" />
                Thêm môn học đầu tiên
              </Button>
            </div>
          )}

          {/* Subjects tree */}
          <div className="space-y-4">
            {subjects.map((subject) => {
              const subjectLevels = getLevelsForSubject(subject.id);
              const isExpanded = expandedSubjects.has(subject.id);

              return (
                <div key={subject.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  {/* Subject header */}
                  <div className="flex items-center gap-3 p-4 hover:bg-muted/30">
                    <button
                      onClick={() => toggleSubject(subject.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleSubject(subject.id)}
                    >
                      <div className="font-medium text-foreground">{subject.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subject.has_levels
                          ? `${subjectLevels.length} cấp độ`
                          : 'Không phân cấp độ'}
                        {subject.description && ` • ${subject.description}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSubject(subject);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSubject(subject);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Subject content */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10 p-4">
                      {subject.has_levels ? (
                        <>
                          {/* Levels */}
                          {subjectLevels.length === 0 && (
                            <div className="mb-4 rounded-lg border border-dashed border-border py-6 text-center text-muted-foreground">
                              Chưa có cấp độ nào
                            </div>
                          )}

                          <div className="space-y-3">
                            {subjectLevels.map((level) => {
                              const levelSections = getSectionsForLevel(level.id);
                              const isLevelExpanded = expandedLevels.has(level.id);

                              return (
                                <div
                                  key={level.id}
                                  className="rounded-lg border border-border bg-background"
                                >
                                  {/* Level header */}
                                  <div className="flex items-center gap-3 p-3 hover:bg-muted/30">
                                    <button
                                      onClick={() => toggleLevel(level.id)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      {isLevelExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                    <Layers className="h-4 w-4 text-amber-500" />
                                    <div
                                      className="flex-1 cursor-pointer"
                                      onClick={() => toggleLevel(level.id)}
                                    >
                                      <span className="font-medium text-foreground">
                                        {level.name}
                                      </span>
                                      <span className="ml-2 text-sm text-muted-foreground">
                                        ({levelSections.length} phần)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingLevel(level);
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingLevel(level);
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Level content - sections */}
                                  {isLevelExpanded && (
                                    <div className="border-t border-border bg-muted/5 p-3">
                                      {levelSections.length === 0 && (
                                        <div className="mb-3 rounded border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
                                          Chưa có phần luyện thi nào
                                        </div>
                                      )}

                                      <div className="mb-3 space-y-2">
                                        {levelSections.map((section) => (
                                          <div
                                            key={section.id}
                                            className="flex items-center gap-2 rounded bg-background p-2 pl-6"
                                          >
                                            <FolderOpen className="h-4 w-4 text-emerald-500" />
                                            <span className="flex-1 text-sm text-foreground">
                                              {section.name}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setEditingSection(section)}
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive hover:text-destructive"
                                                onClick={() => setDeletingSection(section)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Add section form */}
                                      {addingSectionForLevel === level.id ? (
                                        <div className="space-y-2 rounded border border-primary/30 bg-primary/5 p-3">
                                          <Input
                                            placeholder="Tên phần (VD: 文字・語彙)"
                                            value={newSectionName}
                                            onChange={(e) => setNewSectionName(e.target.value)}
                                            disabled={savingSection}
                                            className="text-sm"
                                          />
                                          <Input
                                            placeholder="Mô tả (tùy chọn)"
                                            value={newSectionDesc}
                                            onChange={(e) => setNewSectionDesc(e.target.value)}
                                            disabled={savingSection}
                                            className="text-sm"
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() => handleCreateSection(level.id)}
                                              disabled={savingSection}
                                            >
                                              {savingSection ? 'Đang tạo...' : 'Tạo phần'}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => {
                                                setAddingSectionForLevel(null);
                                                setNewSectionName('');
                                                setNewSectionDesc('');
                                              }}
                                            >
                                              Hủy
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="gap-1"
                                          onClick={() => setAddingSectionForLevel(level.id)}
                                        >
                                          <Plus className="h-3 w-3" />
                                          Thêm phần luyện thi
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Add level form */}
                          {addingLevelForSubject === subject.id ? (
                            <div className="mt-4 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
                              <Input
                                placeholder="Tên cấp độ (VD: N5)"
                                value={newLevelName}
                                onChange={(e) => setNewLevelName(e.target.value)}
                                disabled={savingLevel}
                              />
                              <Input
                                placeholder="Mô tả (tùy chọn)"
                                value={newLevelDesc}
                                onChange={(e) => setNewLevelDesc(e.target.value)}
                                disabled={savingLevel}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCreateLevel(subject.id)}
                                  disabled={savingLevel}
                                >
                                  {savingLevel ? 'Đang tạo...' : 'Tạo cấp độ'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAddingLevelForSubject(null);
                                    setNewLevelName('');
                                    setNewLevelDesc('');
                                  }}
                                >
                                  Hủy
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4 gap-1"
                              onClick={() => setAddingLevelForSubject(subject.id)}
                            >
                              <Plus className="h-4 w-4" />
                              Thêm cấp độ
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Sections directly under subject (no levels) */}
                          <p className="mb-3 text-sm text-muted-foreground">
                            Môn học này không có cấp độ, các phần luyện thi được thêm trực tiếp.
                          </p>
                          {/* TODO: Handle subjects without levels */}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit dialogs */}
      <EditDialog
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        title="Sửa môn học"
        name={editingSubject?.name || ''}
        description={editingSubject?.description || ''}
        hasLevels={editingSubject?.has_levels}
        showHasLevels
        onSave={handleEditSubject}
        saving={savingEdit}
      />

      <EditDialog
        open={!!editingLevel}
        onOpenChange={(open) => !open && setEditingLevel(null)}
        title="Sửa cấp độ"
        name={editingLevel?.name || ''}
        description={editingLevel?.description || ''}
        onSave={handleEditLevel}
        saving={savingEdit}
      />

      <EditDialog
        open={!!editingSection}
        onOpenChange={(open) => !open && setEditingSection(null)}
        title="Sửa phần"
        name={editingSection?.name || ''}
        description={editingSection?.description || ''}
        onSave={handleEditSection}
        saving={savingEdit}
      />

      {/* Delete dialogs */}
      <DeleteDialog
        open={!!deletingSubject}
        onOpenChange={(open) => !open && setDeletingSubject(null)}
        title="Xóa môn học"
        description={`Bạn có chắc muốn xóa môn học "${deletingSubject?.name}"? Tất cả cấp độ và phần luyện thi bên trong cũng sẽ bị xóa.`}
        onConfirm={handleDeleteSubject}
        deleting={isDeleting}
      />

      <DeleteDialog
        open={!!deletingLevel}
        onOpenChange={(open) => !open && setDeletingLevel(null)}
        title="Xóa cấp độ"
        description={`Bạn có chắc muốn xóa cấp độ "${deletingLevel?.name}"? Tất cả phần luyện thi bên trong cũng sẽ bị xóa.`}
        onConfirm={handleDeleteLevel}
        deleting={isDeleting}
      />

      <DeleteDialog
        open={!!deletingSection}
        onOpenChange={(open) => !open && setDeletingSection(null)}
        title="Xóa phần"
        description={`Bạn có chắc muốn xóa phần "${deletingSection?.name}"?`}
        onConfirm={handleDeleteSection}
        deleting={isDeleting}
      />
    </div>
  );
};

export default ManageSubjectsPage;
