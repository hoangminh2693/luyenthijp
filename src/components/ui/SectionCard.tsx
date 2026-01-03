import { Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { getExamsBySection, type Section } from '@/data/quizData';

/**
 * SectionCard Component - Thẻ hiển thị thông tin phần
 */
interface SectionCardProps {
  section: Section;
  subjectSlug: string;
  levelSlug: string;
  index?: number;
}

export function SectionCard({ section, subjectSlug, levelSlug, index = 0 }: SectionCardProps) {
  const exams = getExamsBySection(section.id);
  
  return (
    <Link
      to={`/subjects/${subjectSlug}/${levelSlug}/${section.slug}`}
      className="group block animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          {section.icon}
        </div>

        {/* Content */}
        <h3 className="mb-1 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
          {section.name}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {section.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{exams.length} đề thi</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Xem đề
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/10" />
      </div>
    </Link>
  );
}
