import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type Category, type SubjectLayer, type Subject } from './useSubjectLayers';

/**
 * Hook để resolve category path từ URL slugs
 * Dùng cho các trang cần access category cuối cùng trong path
 * VD: /subjects/jlpt/n5/moji-goi → resolve category "moji-goi" với parent "n5"
 */

export interface ResolvedCategoryPath {
  subject: Subject;
  layers: SubjectLayer[];
  categories: Category[];  // Ordered from root to leaf
  leafCategory: Category;  // Category cuối cùng (để làm bài)
}

// Hook resolve toàn bộ path từ slugs
export function useResolveCategoryPath(
  subjectSlug: string | undefined,
  categoryPath: string | undefined  // "n5/moji-goi" hoặc "nghe"
) {
  return useQuery({
    queryKey: ['resolve-full-path', subjectSlug, categoryPath],
    queryFn: async (): Promise<ResolvedCategoryPath | null> => {
      if (!subjectSlug) return null;
      
      // 1. Fetch subject
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .maybeSingle();
      
      if (subjectError || !subject) return null;
      
      // 2. Fetch all layers of subject
      const { data: layers, error: layersError } = await supabase
        .from('subject_layers')
        .select('*')
        .eq('subject_id', subject.id)
        .order('order_index', { ascending: true });
      
      if (layersError || !layers || layers.length === 0) return null;
      
      // 3. Parse category slugs
      const categorySlugs = categoryPath ? categoryPath.split('/').filter(Boolean) : [];
      
      if (categorySlugs.length === 0) return null;
      
      // 4. Resolve each slug to category
      const categories: Category[] = [];
      let currentParentId: string | null = null;
      
      for (let i = 0; i < categorySlugs.length; i++) {
        const slug = categorySlugs[i];
        const layer = layers[i];
        
        if (!layer) {
          // Có thể là nested category trong cùng layer
          // Thử tìm với parent là category trước đó
          const prevCategory = categories[categories.length - 1];
          if (!prevCategory) return null;
          
          const { data: category, error } = await supabase
            .from('categories')
            .select('*')
            .eq('parent_id', prevCategory.id)
            .eq('slug', slug)
            .maybeSingle();
          
          if (error || !category) return null;
          categories.push(category as Category);
          currentParentId = category.id;
          continue;
        }
        
        // Tìm category trong layer tương ứng
        let query = supabase
          .from('categories')
          .select('*')
          .eq('layer_id', layer.id)
          .eq('slug', slug);
        
        if (currentParentId === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', currentParentId);
        }
        
        const { data: category, error } = await query.maybeSingle();
        
        if (error || !category) return null;
        
        categories.push(category as Category);
        currentParentId = category.id;
      }
      
      if (categories.length === 0) return null;
      
      return {
        subject: subject as Subject,
        layers: layers as SubjectLayer[],
        categories,
        leafCategory: categories[categories.length - 1],
      };
    },
    enabled: !!subjectSlug && !!categoryPath,
  });
}

// Hook đơn giản hơn - chỉ lấy leaf category và basic info
export function useLeafCategory(
  subjectSlug: string | undefined,
  categoryPath: string | undefined
) {
  const { data, isLoading, error } = useResolveCategoryPath(subjectSlug, categoryPath);
  
  return {
    subject: data?.subject,
    categories: data?.categories || [],
    leafCategory: data?.leafCategory,
    layers: data?.layers || [],
    isLoading,
    error,
  };
}

// Hook lấy số câu hỏi của category (dùng questions_safe view để user thường cũng đọc được)
export function useQuestionCountForCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'count', 'for-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return 0;
      
      // Sử dụng questions_safe view (không cần admin role)
      const { count, error } = await supabase
        .from('questions_safe')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .is('parent_id', null);
      
      if (error) {
        console.warn('Error counting questions for category:', error.message);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!categoryId,
  });
}
