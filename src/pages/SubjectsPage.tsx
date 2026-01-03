import { subjects } from '@/data/quizData';
import { SubjectCard } from '@/components/ui/SubjectCard';
import { Breadcrumb } from '@/components/layout/Header';

/**
 * SubjectsPage - Trang danh sách môn học
 */
const SubjectsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb items={[{ label: 'Chọn môn học' }]} />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Chọn môn học
          </h1>
          <p className="text-muted-foreground">
            Chọn môn học bạn muốn luyện tập để xem danh sách các cấp độ
          </p>
        </div>

        {/* Subjects Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject, index) => (
            <SubjectCard key={subject.id} subject={subject} index={index} />
          ))}
        </div>

        {/* Empty state - nếu không có môn học */}
        {subjects.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Chưa có môn học nào. Vui lòng quay lại sau.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectsPage;
