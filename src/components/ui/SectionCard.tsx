import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Play, Loader2 } from 'lucide-react';
import { useQuestionCount } from '@/hooks/useQuestions';

/**
 * SectionCard Component - Thẻ hiển thị thông tin phần
 */
interface SectionCardProps {
  section: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
  };
  subjectSlug: string;
  levelSlug: string;
  index?: number;
}

export function SectionCard({ section, subjectSlug, levelSlug, index = 0 }: SectionCardProps) {
  const { data: totalQuestions = 0, isLoading } = useQuestionCount(section.id);
  
  return (
    <div
      className="group animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          {section.icon || '📝'}
        </div>

        {/* Content */}
        <h3 className="mb-1 text-lg font-bold text-foreground">
          {section.name}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {section.description}
        </p>

        {/* Stats */}
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>{totalQuestions} câu hỏi</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/start/${subjectSlug}/${levelSlug}/${section.slug}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play className="h-4 w-4" />
            Làm bài
          </Link>
          <Link
            to={`/subjects/${subjectSlug}/${levelSlug}/${section.slug}`}
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
