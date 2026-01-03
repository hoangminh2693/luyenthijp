import { useParams, Navigate } from 'react-router-dom';
import { getSubjectBySlug, getLevelBySlug, getSectionsByLevel } from '@/data/quizData';
import { SectionCard } from '@/components/ui/SectionCard';
import { Breadcrumb } from '@/components/layout/Header';

/**
 * SectionsPage - Trang danh sách phần theo cấp độ
 */
const SectionsPage = () => {
  const { subjectSlug, levelSlug } = useParams<{ subjectSlug: string; levelSlug: string }>();
  
  // Lấy thông tin môn học và cấp độ
  const subject = subjectSlug ? getSubjectBySlug(subjectSlug) : undefined;
  const level = subject && levelSlug ? getLevelBySlug(subject.id, levelSlug) : undefined;
  
  // Nếu không tìm thấy, chuyển về trang trước
  if (!subject) {
    return <Navigate to="/subjects" replace />;
  }
  
  if (!level) {
    return <Navigate to={`/subjects/${subjectSlug}`} replace />;
  }

  // Lấy danh sách phần của cấp độ
  const sections = getSectionsByLevel(level.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Chọn môn học', href: '/subjects' },
              { label: subject.name, href: `/subjects/${subject.slug}` },
              { label: level.name },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-4xl">
            {subject.icon}
          </div>
          <div>
            <h1 className="mb-1 text-3xl font-bold text-foreground">
              {subject.name} - {level.name}
            </h1>
            <p className="text-muted-foreground">
              {level.description}
            </p>
          </div>
        </div>

        {/* Section title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Chọn phần luyện tập ({sections.length} phần)
          </h2>
        </div>

        {/* Sections Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section, index) => (
            <SectionCard 
              key={section.id} 
              section={section} 
              subjectSlug={subject.slug}
              levelSlug={level.slug}
              index={index} 
            />
          ))}
        </div>

        {/* Empty state */}
        {sections.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Chưa có phần nào cho cấp độ {level.name}. Vui lòng quay lại sau.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionsPage;
