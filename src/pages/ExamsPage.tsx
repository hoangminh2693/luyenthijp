import { useParams, Navigate, Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getSubjectBySlug, getLevelBySlug, getSectionBySlug, getExamsBySection, getQuestionsBySection } from '@/data/quizData';
import { ExamCard } from '@/components/ui/ExamCard';
import { Breadcrumb } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

/**
 * ExamsPage - Trang danh sách đề thi theo phần
 */
const ExamsPage = () => {
  const { subjectSlug, levelSlug, sectionSlug } = useParams<{ 
    subjectSlug: string; 
    levelSlug: string;
    sectionSlug: string;
  }>();
  
  // Lấy thông tin môn học, cấp độ và phần
  const subject = subjectSlug ? getSubjectBySlug(subjectSlug) : undefined;
  const level = subject && levelSlug ? getLevelBySlug(subject.id, levelSlug) : undefined;
  const section = level && sectionSlug ? getSectionBySlug(level.id, sectionSlug) : undefined;
  
  // Nếu không tìm thấy, chuyển về trang trước
  if (!subject) {
    return <Navigate to="/subjects" replace />;
  }
  
  if (!level) {
    return <Navigate to={`/subjects/${subjectSlug}`} replace />;
  }
  
  if (!section) {
    return <Navigate to={`/subjects/${subjectSlug}/${levelSlug}`} replace />;
  }

  // Lấy danh sách đề thi của phần
  const exams = getExamsBySection(section.id);
  const totalQuestions = getQuestionsBySection(section.id).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Chọn môn học', href: '/subjects' },
              { label: subject.name, href: `/subjects/${subject.slug}` },
              { label: level.name, href: `/subjects/${subject.slug}/${level.slug}` },
              { label: section.name },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-4xl">
              {section.icon}
            </div>
            <div>
              <h1 className="mb-1 text-3xl font-bold text-foreground">
                {section.name}
              </h1>
              <p className="text-muted-foreground">
                {subject.name} - {level.name} | {totalQuestions} câu hỏi
              </p>
            </div>
          </div>
          
          {/* Start quiz button */}
          <Link to={`/start/${subject.slug}/${level.slug}/${section.slug}`}>
            <Button size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              Làm bài ngay
            </Button>
          </Link>
        </div>

        {/* Section title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Danh sách đề thi ({exams.length} đề)
          </h2>
          <p className="text-sm text-muted-foreground">
            Hoặc chọn một đề thi cụ thể để luyện tập
          </p>
        </div>

        {/* Exams Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam, index) => (
            <ExamCard key={exam.id} exam={exam} index={index} />
          ))}
        </div>

        {/* Empty state */}
        {exams.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Chưa có đề thi nào cho phần {section.name}. Vui lòng quay lại sau.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamsPage;
