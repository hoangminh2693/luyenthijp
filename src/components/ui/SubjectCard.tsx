import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { useLayersBySubject, useCategoriesByLayer } from '@/hooks/useSubjectLayers';

/**
 * SubjectCard Component - Thẻ hiển thị thông tin môn học
 * Sử dụng hệ thống Layer động thay vì levels cố định
 */
interface SubjectCardProps {
  subject: {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
  };
  index?: number;
}

export function SubjectCard({ subject, index = 0 }: SubjectCardProps) {
  // Fetch layers và categories của layer đầu tiên
  const { data: layers = [] } = useLayersBySubject(subject.id);
  const firstLayer = layers[0];
  const { data: categories = [] } = useCategoriesByLayer(firstLayer?.id, null);
  
  // Hiển thị số lượng items của layer đầu tiên
  const itemCount = categories.length;
  const layerName = firstLayer?.name || 'phân loại';
  
  return (
    <Link
      to={`/subjects/${subject.slug}`}
      className="group block animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1">
        {/* Icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-3xl">
          {subject.icon}
        </div>

        {/* Content */}
        <h3 className="mb-2 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {subject.name}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {subject.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>{itemCount} {layerName.toLowerCase()}</span>
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
