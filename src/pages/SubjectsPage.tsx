import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Loader2 } from 'lucide-react';
import { SubjectCard } from '@/components/ui/SubjectCard';
import { Breadcrumb } from '@/components/layout/Header';
import { ActivityWidget } from '@/components/ui/ActivityWidget';
import { supabase } from '@/integrations/supabase/client';

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  has_levels: boolean;
}

/**
 * SubjectsPage - Trang danh sách môn học
 */
const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name');

        if (error) throw error;
        setSubjects(data || []);
      } catch (err) {
        console.error('Error loading subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb + Activity Widget */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <Breadcrumb items={[{ label: 'Chọn môn học' }]} />
          <ActivityWidget variant="compact" className="hidden sm:flex" />
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Subjects Grid */}
        {!loading && subjects.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject, index) => (
              <SubjectCard 
                key={subject.id} 
                subject={{
                  id: subject.id,
                  name: subject.name,
                  slug: subject.slug,
                  description: subject.description || '',
                  icon: subject.icon || '📚',
                }} 
                index={index} 
              />
            ))}
          </div>
        )}

        {/* Empty state - nếu không có môn học */}
        {!loading && subjects.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              Chưa có môn học nào.
            </p>
            <p className="text-sm text-muted-foreground">
              Đăng nhập với tài khoản admin để thêm môn học.
            </p>
          </div>
        )}

        {/* SEO: Mô tả tĩnh giúp Google hiểu nội dung trang */}
        <section className="mt-12 rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Về trang luyện đề thi</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trang Chọn môn học là nơi bạn bắt đầu hành trình luyện thi. Chúng tôi cung cấp đề thi trắc nghiệm 
            cho nhiều kỳ thi quan trọng tại Nhật Bản như JLPT (N5–N1), BJT, 宅建 và các chứng chỉ nghề nghiệp khác. 
            Mỗi môn học được chia thành các cấp độ và phần kiến thức cụ thể, giúp bạn tập trung ôn luyện 
            đúng phần mình cần cải thiện.
          </p>
        </section>
      </div>
    </div>
  );
};

export default SubjectsPage;
