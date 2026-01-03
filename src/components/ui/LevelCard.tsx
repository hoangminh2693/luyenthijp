import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark } from 'lucide-react';
import { getSectionsByLevel, type Level } from '@/data/quizData';

/**
 * LevelCard Component - Thẻ hiển thị thông tin cấp độ
 */
interface LevelCardProps {
  level: Level;
  subjectSlug: string;
  index?: number;
}

export function LevelCard({ level, subjectSlug, index = 0 }: LevelCardProps) {
  const sections = getSectionsByLevel(level.id);
  
  return (
    <Link
      to={`/subjects/${subjectSlug}/${level.slug}`}
      className="group block animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1">
        {/* Level badge */}
        <div className="absolute right-4 top-4 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          {level.name}
        </div>

        {/* Content */}
        <h3 className="mb-2 pr-16 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          Cấp độ {level.name}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {level.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Bookmark className="h-4 w-4" />
            <span>{sections.length} phần</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Xem phần
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/10" />
      </div>
    </Link>
  );
}
