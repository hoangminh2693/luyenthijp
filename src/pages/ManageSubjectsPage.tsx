/**
 * ManageSubjectsPage - Trang quản lý môn học, cấp độ, phần luyện thi
 * Chỉ admin mới có quyền truy cập
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, LogIn, Shield, BookOpen, Layers, FolderOpen, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Breadcrumb } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
      const subjectLevels = levels.filter(l => l.subject_id === subjectId);
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
      const levelSections = sections.filter(s => s.level_id === levelId);
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

  // Get levels for a subject
  const getLevelsForSubject = (subjectId: string) => {
    return levels.filter(l => l.subject_id === subjectId);
  };

  // Get sections for a level
  const getSectionsForLevel = (levelId: string) => {
    return sections.filter(s => s.level_id === levelId);
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
            <p className="mb-6 text-muted-foreground">
              Chỉ admin mới có thể quản lý môn học.
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
              { label: 'Quản lý môn học' },
            ]}
          />
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">
                Quản lý môn học
              </h1>
              <p className="text-muted-foreground">
                Thêm và quản lý môn học, cấp độ, phần luyện thi
              </p>
            </div>
            <Button
              onClick={() => setAddingSubject(true)}
              className="gap-2"
              disabled={addingSubject}
            >
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
                <Button
                  onClick={handleCreateSubject}
                  disabled={savingSubject}
                  className="w-full"
                >
                  {savingSubject ? 'Đang tạo...' : 'Tạo môn học'}
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="py-12 text-center text-muted-foreground">
              Đang tải dữ liệu...
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
              const subjectLevels = getLevelsForSubject(subject.id);
              const isExpanded = expandedSubjects.has(subject.id);

              return (
                <div
                  key={subject.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Subject header */}
                  <div
                    className="flex cursor-pointer items-center gap-3 p-4 hover:bg-muted/30"
                    onClick={() => toggleSubject(subject.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{subject.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subject.has_levels
                          ? `${subjectLevels.length} cấp độ`
                          : 'Không phân cấp độ'}
                        {subject.description && ` • ${subject.description}`}
                      </div>
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
                                <div key={level.id} className="rounded-lg border border-border bg-background">
                                  {/* Level header */}
                                  <div
                                    className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/30"
                                    onClick={() => toggleLevel(level.id)}
                                  >
                                    {isLevelExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <Layers className="h-4 w-4 text-amber-500" />
                                    <div className="flex-1">
                                      <span className="font-medium text-foreground">{level.name}</span>
                                      <span className="ml-2 text-sm text-muted-foreground">
                                        ({levelSections.length} phần)
                                      </span>
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
                                            <span className="text-sm text-foreground">{section.name}</span>
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
    </div>
  );
};

export default ManageSubjectsPage;
