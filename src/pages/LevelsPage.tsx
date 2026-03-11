import { useParams, Navigate } from 'react-router-dom';
import { getSubjectBySlug, getLevelsBySubject } from '@/data/quizData';
import { LevelCard } from '@/components/ui/LevelCard';
import { Breadcrumb } from '@/components/layout/Header';
import { useSEO, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

/**
 * LevelsPage - Trang danh sách cấp độ theo môn học
 */
const LevelsPage = () => {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  
  // Lấy thông tin môn học
  const subject = subjectSlug ? getSubjectBySlug(subjectSlug) : undefined;

  useSEO({
    title: subject ? `${subject.name} - Chọn cấp độ luyện thi | Luyện Đề Thi` : 'Chọn cấp độ | Luyện Đề Thi',
    description: subject ? `Chọn cấp độ luyện thi ${subject.name}. Luyện đề thi trắc nghiệm miễn phí tại Nhật Bản.` : 'Chọn cấp độ luyện thi trắc nghiệm.',
    jsonLd: buildBreadcrumbSchema([
      { name: 'Trang chủ', url: SITE_URL },
      { name: 'Chọn môn học', url: `${SITE_URL}/subjects` },
      ...(subject ? [{ name: subject.name }] : []),
    ]),
  });
  
  // Nếu không tìm thấy môn học, chuyển về trang danh sách môn
  if (!subject) {
    return <Navigate to="/subjects" replace />;
  }

  // Lấy danh sách cấp độ của môn
  const levels = getLevelsBySubject(subject.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Chọn môn học', href: '/subjects' },
              { label: subject.name },
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
              {subject.name}
            </h1>
            <p className="text-muted-foreground">
              {subject.description}
            </p>
          </div>
        </div>

        {/* Section title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Chọn cấp độ ({levels.length} cấp độ)
          </h2>
        </div>

        {/* Levels Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((level, index) => (
            <LevelCard key={level.id} level={level} subjectSlug={subject.slug} index={index} />
          ))}
        </div>

        {/* Empty state */}
        {levels.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Chưa có cấp độ nào cho môn {subject.name}. Vui lòng quay lại sau.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelsPage;
