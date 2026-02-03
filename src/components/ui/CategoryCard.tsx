import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Play, Loader2, Layers } from 'lucide-react';
import { useQuestionCountByCategory, useCategoriesByParent, type Category } from '@/hooks/useSubjectLayers';

/**
 * CategoryCard Component - Thẻ hiển thị thông tin category động
 * Tự động xác định xem là leaf (có nút làm bài) hay branch (có nút xem tiếp)
 */
interface CategoryCardProps {
  category: Category;
  subjectSlug: string;
  parentPath?: string;  // Path đến parent (VD: "n5" hoặc "n5/moji-goi")
  index?: number;
  isLeaf?: boolean;     // Override: true = hiển thị nút làm bài
}

export function CategoryCard({ 
  category, 
  subjectSlug, 
  parentPath = '', 
  index = 0,
  isLeaf: isLeafOverride
}: CategoryCardProps) {
  const { data: questionCount = 0, isLoading: loadingCount } = useQuestionCountByCategory(category.id);
  const { data: children = [] } = useCategoriesByParent(category.id);
  
  // Xác định xem category này là leaf hay branch
  const isLeaf = isLeafOverride ?? (children.length === 0);
  
  // Xây dựng URL
  const categoryPath = parentPath ? `${parentPath}/${category.slug}` : category.slug;
  const viewUrl = `/subjects/${subjectSlug}/${categoryPath}`;
  const startUrl = `/start/${subjectSlug}/${categoryPath}`;
  
  // Nếu là leaf, hiển thị card với nút Làm bài
  if (isLeaf) {
    return (
      <div
        className="group animate-fade-in-up opacity-0"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover">
          {/* Icon */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
            {category.icon || '📝'}
          </div>

          {/* Content */}
          <h3 className="mb-1 text-lg font-bold text-foreground">
            {category.name}
          </h3>
          {category.description && (
            <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
              {category.description}
            </p>
          )}

          {/* Stats */}
          <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {loadingCount ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>{questionCount} câu hỏi</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              to={startUrl}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Play className="h-4 w-4" />
              Làm bài
            </Link>
            <Link
              to={viewUrl}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Xem đề
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Decorative gradient */}
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/10" />
        </div>
      </div>
    );
  }

  // Nếu là branch, hiển thị card navigation
  return (
    <Link
      to={viewUrl}
      className="group block animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1">
        {/* Badge (nếu cần) */}
        {category.name.match(/^N[1-5]$/) && (
          <div className="absolute right-4 top-4 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {category.name}
          </div>
        )}

        {/* Icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-3xl">
          {category.icon || '📚'}
        </div>

        {/* Content */}
        <h3 className="mb-2 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        {category.description && (
          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
            {category.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>{children.length} mục</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Xem chi tiết
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/10" />
      </div>
    </Link>
  );
}
