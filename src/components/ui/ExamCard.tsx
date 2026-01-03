import { Link } from 'react-router-dom';
import { ArrowRight, Clock, HelpCircle } from 'lucide-react';
import type { Exam } from '@/data/quizData';

/**
 * ExamCard Component - Thẻ hiển thị thông tin đề thi
 */
interface ExamCardProps {
  exam: Exam;
  index?: number;
}

export function ExamCard({ exam, index = 0 }: ExamCardProps) {
  return (
    <Link
      to={`/exam/${exam.id}`}
      className="group block animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1">
        {/* Content */}
        <h3 className="mb-2 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
          {exam.name}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {exam.description}
        </p>

        {/* Stats */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>{exam.questionCount} câu hỏi</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{exam.duration} phút</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-1 text-sm font-medium text-primary">
          Bắt đầu làm bài
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>

        {/* Decorative gradient */}
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/10" />
      </div>
    </Link>
  );
}
