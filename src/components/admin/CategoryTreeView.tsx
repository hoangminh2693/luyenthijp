/**
 * CategoryTreeView - Hiển thị cây categories theo layers
 */
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, FolderOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SubjectLayer, Category } from '@/hooks/useSubjectLayers';

interface CategoryTreeViewProps {
  subjectId: string;
  layers: SubjectLayer[];
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (category: Category) => void;
}

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  questionCount?: number;
}

export function CategoryTreeView({
  subjectId,
  layers,
  onEditCategory,
  onDeleteCategory,
}: CategoryTreeViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Adding states
  const [addingForParent, setAddingForParent] = useState<string | null>(null);
  const [addingForLayer, setAddingForLayer] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [saving, setSaving] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('subject_id', subjectId)
          .order('order_index', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error loading categories:', err);
        toast.error('Lỗi khi tải danh mục');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [subjectId]);

  // Toggle expand
  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCategories(newSet);
  };

  // Get categories for a layer and parent
  const getCategoriesForLayerAndParent = (layerId: string, parentId: string | null): Category[] => {
    return categories.filter(
      (c) => c.layer_id === layerId && c.parent_id === parentId
    );
  };

  // Create slug
  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Add category
  const handleAddCategory = async (layerId: string, parentId: string | null) => {
    if (!newCategoryName.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    setSaving(true);
    try {
      const existingCategories = getCategoriesForLayerAndParent(layerId, parentId);
      const orderIndex = existingCategories.length;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          subject_id: subjectId,
          layer_id: layerId,
          parent_id: parentId,
          name: newCategoryName.trim(),
          slug: createSlug(newCategoryName),
          icon: newCategoryIcon || null,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setNewCategoryName('');
      setNewCategoryIcon('');
      setAddingForParent(null);
      setAddingForLayer(null);
      toast.success('Đã thêm danh mục');

      // Auto expand parent if exists
      if (parentId) {
        setExpandedCategories(new Set([...expandedCategories, parentId]));
      }
    } catch (err: any) {
      console.error('Error adding category:', err);
      toast.error(err.message || 'Lỗi khi thêm danh mục');
    } finally {
      setSaving(false);
    }
  };

  // Get layer color based on index
  const getLayerColor = (layerIndex: number) => {
    const colors = ['text-primary', 'text-amber-500', 'text-emerald-500', 'text-purple-500'];
    return colors[layerIndex % colors.length];
  };

  // Render categories recursively
  const renderCategories = (layerIndex: number, parentId: string | null, depth: number = 0) => {
    if (layerIndex >= layers.length) return null;

    const layer = layers[layerIndex];
    const layerCategories = getCategoriesForLayerAndParent(layer.id, parentId);

    // Check if we're adding for this layer and parent
    const isAddingHere = addingForLayer === layer.id && addingForParent === (parentId || 'root');

    return (
      <div className={depth > 0 ? 'ml-6 border-l border-border pl-4' : ''}>
        {/* Categories list */}
        {layerCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const childCategories = layerIndex + 1 < layers.length
            ? getCategoriesForLayerAndParent(layers[layerIndex + 1].id, category.id)
            : [];
          const hasChildren = childCategories.length > 0;
          const nextLayer = layers[layerIndex + 1];

          return (
            <div key={category.id} className="mb-2">
              <div className="flex items-center gap-2 rounded-lg bg-background p-2 hover:bg-muted/50">
                {nextLayer ? (
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <div className="w-4" />
                )}
                
                {layerIndex === 0 ? (
                  <Layers className={`h-4 w-4 ${getLayerColor(layerIndex)}`} />
                ) : (
                  <FolderOpen className={`h-4 w-4 ${getLayerColor(layerIndex)}`} />
                )}
                
                {category.icon && <span className="text-lg">{category.icon}</span>}
                
                <div className="flex-1">
                  <span className="font-medium text-foreground">{category.name}</span>
                  {hasChildren && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({childCategories.length} {nextLayer?.name.toLowerCase()})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {nextLayer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => {
                        setAddingForLayer(nextLayer.id);
                        setAddingForParent(category.id);
                        setExpandedCategories(new Set([...expandedCategories, category.id]));
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      {nextLayer.name}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEditCategory?.(category)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDeleteCategory?.(category)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Children */}
              {isExpanded && nextLayer && (
                <div className="mt-1">
                  {renderCategories(layerIndex + 1, category.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}

        {/* Add form */}
        {isAddingHere && (
          <div className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Icon (emoji)"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                disabled={saving}
                className="w-16 text-center"
                maxLength={2}
              />
              <Input
                placeholder={`Tên ${layer.name.toLowerCase()} mới`}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={saving}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAddCategory(layer.id, parentId)}
                disabled={saving}
              >
                {saving ? 'Đang thêm...' : `Thêm ${layer.name}`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddingForLayer(null);
                  setAddingForParent(null);
                  setNewCategoryName('');
                  setNewCategoryIcon('');
                }}
              >
                Hủy
              </Button>
            </div>
          </div>
        )}

        {/* Add button for root level */}
        {depth === 0 && !isAddingHere && layerCategories.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-4 text-center">
            <p className="mb-2 text-sm text-muted-foreground">
              Chưa có {layer.name.toLowerCase()} nào
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setAddingForLayer(layer.id);
                setAddingForParent('root');
              }}
            >
              <Plus className="h-3 w-3" />
              Thêm {layer.name}
            </Button>
          </div>
        )}

        {depth === 0 && layerCategories.length > 0 && !isAddingHere && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1"
            onClick={() => {
              setAddingForLayer(layer.id);
              setAddingForParent('root');
            }}
          >
            <Plus className="h-3 w-3" />
            Thêm {layer.name}
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground">Đang tải...</div>;
  }

  if (layers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-6 text-center text-muted-foreground">
        Môn học chưa có cấu hình layers
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Cấu trúc: {layers.map((l) => l.name).join(' → ')}
        </span>
      </div>
      {renderCategories(0, null, 0)}
    </div>
  );
}
