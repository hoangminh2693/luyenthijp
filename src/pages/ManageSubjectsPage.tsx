/**
 * ManageSubjectsPage - Trang quản lý môn học với hệ thống Layers động
 * Chỉ admin mới có quyền truy cập
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import type { CategoryModeSettings } from '@/components/admin/CategoryModeConfig';
import {
  Plus,
  LogIn,
  Shield,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { EditDialog } from '@/components/admin/EditDialog';
import { DeleteDialog } from '@/components/admin/DeleteDialog';
import { AddSubjectForm } from '@/components/admin/AddSubjectForm';
import { CategoryTreeView } from '@/components/admin/CategoryTreeView';
import type { Subject, SubjectLayer, Category } from '@/hooks/useSubjectLayers';

const ManageSubjectsPage = () => {
  useSEO({ title: 'Quản lý môn học | Admin', description: 'Quản lý môn học và danh mục.', noindex: true });
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectLayers, setSubjectLayers] = useState<Record<string, SubjectLayer[]>>({});
  const [loading, setLoading] = useState(true);

  // Expanded subjects
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // Adding state
  const [addingSubject, setAddingSubject] = useState(false);

  // Edit states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete states
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      const [subjectsRes, layersRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('subject_layers').select('*').order('order_index'),
      ]);

      if (subjectsRes.error) throw subjectsRes.error;
      if (layersRes.error) throw layersRes.error;

      setSubjects((subjectsRes.data || []) as Subject[]);

      // Group layers by subject
      const layersBySubject: Record<string, SubjectLayer[]> = {};
      (layersRes.data || []).forEach((layer: SubjectLayer) => {
        if (!layersBySubject[layer.subject_id]) {
          layersBySubject[layer.subject_id] = [];
        }
        layersBySubject[layer.subject_id].push(layer);
      });
      setSubjectLayers(layersBySubject);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  // Slug helper
  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Edit subject
  const handleEditSubject = async (name: string, description: string) => {
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
        })
        .eq('id', editingSubject.id);

      if (error) throw error;

      setSubjects(
        subjects.map((s) =>
          s.id === editingSubject.id
            ? { ...s, name: name.trim(), slug, description: description.trim() || null }
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

  // Edit category
  const handleEditCategory = async (name: string, description: string, _hasLevels?: boolean, modeSettings?: CategoryModeSettings) => {
    if (!editingCategory) return;

    setSavingEdit(true);
    try {
      const slug = createSlug(name);
      const updateData: Record<string, any> = {
        name: name.trim(),
        slug,
        description: description.trim() || null,
      };
      if (modeSettings) {
        updateData.allow_random = modeSettings.allow_random;
        updateData.allow_count_selection = modeSettings.allow_count_selection;
        updateData.fixed_exam_mode = modeSettings.fixed_exam_mode;
      }
      const { error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', editingCategory.id);

      if (error) throw error;

      setEditingCategory(null);
      toast.success('Đã cập nhật danh mục');
      loadData();
    } catch (err: any) {
      console.error('Error updating category:', err);
      toast.error(err.message || 'Lỗi khi cập nhật danh mục');
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

      setSubjects(subjects.filter((s) => s.id !== deletingSubject.id));
      const newLayers = { ...subjectLayers };
      delete newLayers[deletingSubject.id];
      setSubjectLayers(newLayers);
      setDeletingSubject(null);
      toast.success('Đã xóa môn học');
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      toast.error(err.message || 'Lỗi khi xóa môn học');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deletingCategory.id);

      if (error) throw error;

      setDeletingCategory(null);
      toast.success('Đã xóa danh mục');
      loadData();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      toast.error(err.message || 'Lỗi khi xóa danh mục');
    } finally {
      setIsDeleting(false);
    }
  };

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

        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Quản lý môn học</h1>
              <p className="text-muted-foreground">
                Thêm, sửa, xóa môn học và cấu hình phân loại động
              </p>
            </div>
            <Button onClick={() => setAddingSubject(true)} className="gap-2" disabled={addingSubject}>
              <Plus className="h-4 w-4" />
              Thêm môn học
            </Button>
          </div>

          {/* Add new subject form */}
          {addingSubject && (
            <div className="mb-6">
              <AddSubjectForm
                onClose={() => setAddingSubject(false)}
                onSubjectCreated={() => {
                  loadData();
                  setAddingSubject(false);
                }}
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
              const layers = subjectLayers[subject.id] || [];
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                      {subject.icon || '📚'}
                    </div>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleSubject(subject.id)}
                    >
                      <div className="font-medium text-foreground">{subject.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {layers.length > 0 
                          ? `${layers.length} layers: ${layers.map(l => l.name).join(' → ')}`
                          : 'Chưa cấu hình layers'}
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

                  {/* Subject content - Category Tree */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10 p-4">
                      <CategoryTreeView
                        subjectId={subject.id}
                        layers={layers}
                        onEditCategory={setEditingCategory}
                        onDeleteCategory={setDeletingCategory}
                      />
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
        onSave={handleEditSubject}
        saving={savingEdit}
      />

      <EditDialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        title="Sửa danh mục"
        name={editingCategory?.name || ''}
        description={editingCategory?.description || ''}
        showModeConfig
        modeSettings={editingCategory ? {
          allow_random: editingCategory.allow_random,
          allow_count_selection: editingCategory.allow_count_selection,
          fixed_exam_mode: editingCategory.fixed_exam_mode,
        } : undefined}
        onSave={handleEditCategory}
        saving={savingEdit}
      />

      {/* Delete dialogs */}
      <DeleteDialog
        open={!!deletingSubject}
        onOpenChange={(open) => !open && setDeletingSubject(null)}
        title="Xóa môn học"
        description={`Bạn có chắc muốn xóa môn học "${deletingSubject?.name}"? Tất cả layers, danh mục và câu hỏi bên trong cũng sẽ bị xóa.`}
        onConfirm={handleDeleteSubject}
        deleting={isDeleting}
      />

      <DeleteDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Xóa danh mục"
        description={`Bạn có chắc muốn xóa danh mục "${deletingCategory?.name}"? Tất cả danh mục con và câu hỏi bên trong cũng sẽ bị xóa.`}
        onConfirm={handleDeleteCategory}
        deleting={isDeleting}
      />
    </div>
  );
};

export default ManageSubjectsPage;
