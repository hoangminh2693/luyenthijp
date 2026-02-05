import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hooks cho hệ thống phân loại Layer động
 * - Subject có nhiều Layers
 * - Mỗi Layer có nhiều Categories
 * - Categories có thể nested (parent_id)
 */

export interface SubjectLayer {
  id: string;
  subject_id: string;
  name: string;          // VD: "Cấp độ", "Kỹ năng", "Phần thi"
  slug: string;
  order_index: number;   // Thứ tự layer (0, 1, 2...)
  required: boolean;     // Bắt buộc chọn?
}

export interface Category {
  id: string;
  subject_id: string;
  layer_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  order_index: number | null;
  // Cấu hình logic làm bài
  allow_random: boolean;
  allow_count_selection: boolean;
  fixed_exam_mode: boolean;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  has_levels: boolean;
}

// Hook lấy subject theo slug
export function useSubjectBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['subject', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Subject | null;
    },
    enabled: !!slug,
  });
}

// Hook lấy tất cả subjects
export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return (data || []) as Subject[];
    },
  });
}

// Hook lấy tất cả layers của một subject (theo thứ tự)
export function useLayersBySubject(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['subject-layers', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from('subject_layers')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return (data || []) as SubjectLayer[];
    },
    enabled: !!subjectId,
  });
}

// Hook lấy layer theo index trong subject
export function useLayerByIndex(subjectId: string | undefined, layerIndex: number) {
  return useQuery({
    queryKey: ['subject-layer', subjectId, layerIndex],
    queryFn: async () => {
      if (!subjectId) return null;
      
      const { data, error } = await supabase
        .from('subject_layers')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('order_index', layerIndex)
        .maybeSingle();
      
      if (error) throw error;
      return data as SubjectLayer | null;
    },
    enabled: !!subjectId,
  });
}

// Hook lấy categories của layer (top-level hoặc theo parent)
export function useCategoriesByLayer(
  layerId: string | undefined, 
  parentId: string | null = null
) {
  return useQuery({
    queryKey: ['categories', 'layer', layerId, parentId],
    queryFn: async () => {
      if (!layerId) return [];
      
      let query = supabase
        .from('categories')
        .select('*')
        .eq('layer_id', layerId)
        .order('order_index', { ascending: true });
      
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as Category[];
    },
    enabled: !!layerId,
  });
}

// Hook lấy categories theo parent_id (cho nested navigation)
export function useCategoriesByParent(parentId: string | undefined) {
  return useQuery({
    queryKey: ['categories', 'parent', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', parentId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Category[];
    },
    enabled: !!parentId,
  });
}

// Hook lấy category theo slug và layer
export function useCategoryBySlug(
  layerId: string | undefined, 
  slug: string | undefined,
  parentId: string | null = null
) {
  return useQuery({
    queryKey: ['category', layerId, slug, parentId],
    queryFn: async () => {
      if (!layerId || !slug) return null;
      
      let query = supabase
        .from('categories')
        .select('*')
        .eq('layer_id', layerId)
        .eq('slug', slug);
      
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data as Category | null;
    },
    enabled: !!layerId && !!slug,
  });
}

// Hook lấy category theo id
export function useCategoryById(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Category | null;
    },
    enabled: !!categoryId,
  });
}

// Hook lấy đường dẫn từ root đến category (breadcrumb)
export function useCategoryPath(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['category-path', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      const path: Category[] = [];
      let currentId: string | null = categoryId;
      
      while (currentId) {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('id', currentId)
          .maybeSingle();
        
        if (error) throw error;
        if (!data) break;
        
        path.unshift(data as Category);
        currentId = data.parent_id;
      }
      
      return path;
    },
    enabled: !!categoryId,
  });
}

// Hook lấy số lượng câu hỏi theo category
// Sử dụng view questions_safe (có quyền public access)
export function useQuestionCountByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'count', 'category', categoryId],
    queryFn: async () => {
      if (!categoryId) return 0;
      
      // Đếm từ view questions_safe (có category_id và public access)
      // Chỉ đếm câu hỏi cha (không có parent_id) để tránh đếm trùng câu con
      const { count, error } = await supabase
        .from('questions_safe')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .is('parent_id', null);
      
      if (error) {
        console.warn('Could not count questions by category:', error.message);
        return 0;
      }
      return count || 0;
    },
    enabled: !!categoryId,
  });
}

// Helper: Xây dựng URL động dựa trên path categories
export function buildCategoryUrl(subjectSlug: string, categoryPath: Category[]): string {
  const slugs = categoryPath.map(c => c.slug).join('/');
  return `/subjects/${subjectSlug}/${slugs}`;
}

// Helper: Kiểm tra xem category có phải là leaf (không có children)
export async function isCategoryLeaf(categoryId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', categoryId);
  
  if (error) return true; // Assume leaf on error
  return count === 0;
}
