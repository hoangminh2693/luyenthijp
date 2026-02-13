import { useParams, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { ActivityWidget } from '@/components/ui/ActivityWidget';
import { Breadcrumb } from '@/components/layout/Header';
import { 
  useSubjectBySlug, 
  useLayersBySubject,
  useCategoriesByLayer,
  useCategoriesByParent,
  type Category,
  type SubjectLayer 
} from '@/hooks/useSubjectLayers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSEO, buildPracticeTestSchema, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

/**
 * DynamicCategoryPage - Trang hiển thị categories động theo cấu hình layers
 * 
 * URL format: /subjects/:subjectSlug/:...categorySlugs
 * 
 * Ví dụ:
 * - /subjects/jlpt          → Hiển thị Layer 1 (Cấp độ: N5, N4, N3...)
 * - /subjects/jlpt/n5       → Hiển thị Layer 2 (Kỹ năng: 文字・語彙, 文法...)
 * - /subjects/jlpt/n5/moji  → Nếu không còn layer, redirect đến start/exams
 * - /subjects/bjt           → Hiển thị Layer 1 (Kỹ năng: Nghe, Đọc)
 */
const DynamicCategoryPage = () => {
  const { subjectSlug, '*': wildcardPath } = useParams<{ 
    subjectSlug: string; 
    '*': string; 
  }>();
  const location = useLocation();
  
  // Parse category slugs từ wildcard path
  const categorySlugs = wildcardPath ? wildcardPath.split('/').filter(Boolean) : [];
  const currentDepth = categorySlugs.length;
  
  // Fetch subject
  const { data: subject, isLoading: loadingSubject } = useSubjectBySlug(subjectSlug);
  
  // Fetch all layers của subject
  const { data: layers = [], isLoading: loadingLayers } = useLayersBySubject(subject?.id);
  
  // Xác định layer hiện tại và category cha
  // Depth 0 = show layer[0] categories
  // Depth 1 = show layer[1] categories filtered by parent from layer[0]
  const currentLayer = layers[currentDepth] as SubjectLayer | undefined;
  const parentLayer = currentDepth > 0 ? layers[currentDepth - 1] : undefined;
  
  // Resolve parent category từ slugs
  const { data: resolvedPath, isLoading: loadingPath } = useQuery({
    queryKey: ['resolve-category-path', subject?.id, categorySlugs],
    queryFn: async () => {
      if (!subject?.id || categorySlugs.length === 0) return [];
      
      const path: Category[] = [];
      let currentParentId: string | null = null;
      
      for (let i = 0; i < categorySlugs.length; i++) {
        const slug = categorySlugs[i];
        const layer = layers[i];
        
        if (!layer) break;
        
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
        
        const { data, error } = await query.maybeSingle();
        
        if (error || !data) return null; // Path không hợp lệ
        
        path.push(data as Category);
        currentParentId = data.id;
      }
      
      return path;
    },
    enabled: !!subject?.id && layers.length > 0,
  });
  
  // Lấy categories để hiển thị
  const parentCategory = resolvedPath?.[resolvedPath.length - 1];
  
  // Nếu còn layer tiếp theo, lấy categories của layer đó với parent là category cuối
  // Nếu không còn layer, lấy children của parent (nếu có)
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['display-categories', currentLayer?.id, parentCategory?.id, subject?.id],
    queryFn: async () => {
      // Nếu còn layer tiếp theo
      if (currentLayer) {
        let query = supabase
          .from('categories')
          .select('*')
          .eq('layer_id', currentLayer.id)
          .order('order_index', { ascending: true });
        
        if (parentCategory) {
          query = query.eq('parent_id', parentCategory.id);
        } else {
          query = query.is('parent_id', null);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as Category[];
      }
      
      // Nếu không còn layer, check children của parent
      if (parentCategory) {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('parent_id', parentCategory.id)
          .order('order_index', { ascending: true });
        
        if (error) throw error;
        return (data || []) as Category[];
      }
      
      return [];
    },
    enabled: !!subject?.id && (loadingPath ? false : true),
  });
  
  const isLoading = loadingSubject || loadingLayers || loadingPath || loadingCategories;

  // SEO - compute values (hooks must be called before any return)
  const pageTitle = parentCategory
    ? `${parentCategory.name} - ${subject?.name || ''} | Luyện Đề Thi`
    : `${subject?.name || ''} - Luyện đề thi trắc nghiệm | Luyện Đề Thi`;
  const pageDesc = parentCategory?.description || subject?.description 
    || `Luyện tập ${subject?.name || ''} với nhiều cấp độ và kỹ năng khác nhau. Đề thi trắc nghiệm chất lượng, chấm điểm tự động.`;
  
  const seoPath = categorySlugs.length > 0
    ? `/subjects/${subject?.slug || subjectSlug}/${categorySlugs.join('/')}`
    : `/subjects/${subject?.slug || subjectSlug}`;

  const breadcrumbSchemaItems: { name: string; url?: string }[] = [
    { name: 'Trang chủ', url: SITE_URL },
    { name: 'Chọn môn học', url: `${SITE_URL}/subjects` },
  ];
  if (resolvedPath && resolvedPath.length > 0 && subject) {
    breadcrumbSchemaItems.push({ name: subject.name, url: `${SITE_URL}/subjects/${subject.slug}` });
    let p = '';
    resolvedPath.forEach((cat, idx) => {
      p = p ? `${p}/${cat.slug}` : cat.slug;
      breadcrumbSchemaItems.push({
        name: cat.name,
        url: idx < resolvedPath.length - 1 ? `${SITE_URL}/subjects/${subject.slug}/${p}` : undefined,
      });
    });
  } else if (subject) {
    breadcrumbSchemaItems.push({ name: subject.name });
  }

  useSEO({
    title: pageTitle,
    description: pageDesc,
    canonical: `${SITE_URL}${seoPath}`,
    jsonLd: [
      buildBreadcrumbSchema(breadcrumbSchemaItems),
      ...(parentCategory && subject ? [buildPracticeTestSchema({
        name: `Luyện thi ${parentCategory.name} - ${subject.name}`,
        description: pageDesc,
        url: `${SITE_URL}${seoPath}`,
        educationalLevel: parentCategory.name,
        about: subject.name,
      })] : []),
    ],
  });
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Không tìm thấy subject
  if (!subject) {
    return <Navigate to="/subjects" replace />;
  }
  
  // Path không hợp lệ (resolvedPath === null)
  if (categorySlugs.length > 0 && resolvedPath === null) {
    return <Navigate to={`/subjects/${subjectSlug}`} replace />;
  }
  
  // Nếu không còn categories và đang ở leaf category → có thể redirect đến trang làm bài
  if (categories.length === 0 && parentCategory) {
    const categoryPath = categorySlugs.join('/');
    return <Navigate to={`/start/${subjectSlug}/${categoryPath}`} replace />;
  }
  
  // Build breadcrumb items
  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: 'Chọn môn học', href: '/subjects' },
  ];
  
  if (resolvedPath && resolvedPath.length > 0) {
    breadcrumbItems.push({ 
      label: subject.name, 
      href: `/subjects/${subject.slug}` 
    });
    
    let pathSoFar = '';
    resolvedPath.forEach((cat, idx) => {
      pathSoFar = pathSoFar ? `${pathSoFar}/${cat.slug}` : cat.slug;
      const isLast = idx === resolvedPath.length - 1;
      breadcrumbItems.push({
        label: cat.name,
        href: isLast ? undefined : `/subjects/${subject.slug}/${pathSoFar}`,
      });
    });
  } else {
    breadcrumbItems.push({ label: subject.name });
  }
  
  // Xác định title và description
  const displayTitle = parentCategory?.name || subject.name;
  const displayDescription = parentCategory?.description || subject.description;
  const displayIcon = parentCategory?.icon || subject.icon || '📚';
  
  const layerTitle = currentLayer 
    ? `Chọn ${currentLayer.name.toLowerCase()} (${categories.length} ${currentLayer.name.toLowerCase()})`
    : `Chọn mục (${categories.length} mục)`;
  
  const parentPathForCards = categorySlugs.join('/');

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb + Activity Widget */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <Breadcrumb items={breadcrumbItems} />
          <ActivityWidget variant="compact" className="hidden sm:flex" />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-4xl">
            {displayIcon}
          </div>
          <div>
            <h1 className="mb-1 text-3xl font-bold text-foreground">
              {displayTitle}
            </h1>
            {displayDescription && (
              <p className="text-muted-foreground">
                {displayDescription}
              </p>
            )}
          </div>
        </div>

        {/* Section title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {layerTitle}
          </h2>
        </div>

        {/* Categories Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <CategoryCard 
              key={category.id} 
              category={category}
              subjectSlug={subject.slug}
              parentPath={parentPathForCards}
              index={index}
            />
          ))}
        </div>

        {/* Empty state */}
        {categories.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Chưa có nội dung. Vui lòng quay lại sau.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicCategoryPage;
