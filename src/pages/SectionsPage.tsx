import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { Breadcrumb } from '@/components/layout/Header';
import { useSubjectBySlug, useLevelBySlug } from '@/hooks/useSections';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSEO, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';
import { SeoDescriptionBlock } from '@/components/ui/SeoDescriptionBlock';
import { SmartAdSense } from '@/components/ads/SmartAdSense';

/**
 * SectionsPage - Trang danh sách phần theo cấp độ
 */
const SectionsPage = () => {
  const { subjectSlug, levelSlug } = useParams<{ subjectSlug: string; levelSlug: string }>();
  
  // Fetch dữ liệu từ Supabase
  const { data: subject, isLoading: loadingSubject } = useSubjectBySlug(subjectSlug);
  const { data: level, isLoading: loadingLevel } = useLevelBySlug(subject?.id, levelSlug);

  useSEO({
    title: subject && level ? `${subject.name} ${level.name} - Chọn phần luyện thi | Luyện Đề Thi` : 'Chọn phần luyện thi | Luyện Đề Thi',
    description: subject && level ? `Chọn phần luyện thi ${subject.name} ${level.name}. Đề thi trắc nghiệm miễn phí.` : 'Chọn phần luyện thi trắc nghiệm.',
    jsonLd: buildBreadcrumbSchema([
      { name: 'Trang chủ', url: SITE_URL },
      { name: 'Chọn môn học', url: `${SITE_URL}/subjects` },
      ...(subject ? [{ name: subject.name, url: `${SITE_URL}/subjects/${subject.slug}` }] : []),
      ...(level ? [{ name: level.name }] : []),
    ]),
  });
  
  // Fetch sections từ database
  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['sections', level?.id],
    queryFn: async () => {
      if (!level?.id) return [];
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('level_id', level.id)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!level?.id,
  });

  const isLoading = loadingSubject || loadingLevel || loadingSections;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Nếu không tìm thấy, chuyển về trang trước
  if (!subject) {
    return <Navigate to="/subjects" replace />;
  }
  
  if (!level) {
    return <Navigate to={`/subjects/${subjectSlug}`} replace />;
  }

  const seoFallbackText = `${subject.name} ${level.name} là khu vực luyện thi được chia theo từng phần kiến thức để bạn dễ chọn đúng nội dung cần ôn tập. Thay vì làm bài ngẫu nhiên ngay từ đầu, bạn nên xem qua danh sách phần luyện tập, xác định kỹ năng còn yếu và luyện theo thứ tự phù hợp với mục tiêu thi của mình.

Ở mỗi phần, người học có thể làm câu hỏi trắc nghiệm, xem kết quả sau khi nộp bài và đọc giải thích để hiểu rõ hơn về đáp án. Cách học này đặc biệt hữu ích với người Việt tại Nhật vì thời gian học thường bị chia nhỏ bởi công việc, học tập và sinh hoạt hằng ngày. Chỉ cần luyện đều đặn từng phần, bạn sẽ dễ nhận ra lỗi sai lặp lại và cải thiện tốc độ làm bài.

Hãy bắt đầu với phần bạn chưa tự tin nhất, sau đó quay lại luyện các phần đã làm sai nhiều lần. Việc ôn luyện có hệ thống giúp bạn xây dựng nền tảng chắc hơn trước khi bước vào đề thi đầy đủ.`;
  const adContentLength = [subject.name, level.name, level.description, seoFallbackText, sections.map((s) => `${s.name} ${s.description || ''}`).join(' ')].join(' ').length;

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
            {subject.icon || '📚'}
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

        {/* SEO Description Block */}
        <SeoDescriptionBlock
          title={`Giới thiệu ${subject.name} ${level.name}`}
          content={level.description}
          fallback={seoFallbackText}
        />

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

        {/* Quảng cáo - chỉ khi có nội dung */}
        <SmartAdSense slot="auto" hasContent={sections.length > 0} minContentLength={1200} contentLength={adContentLength} />

        {/* Empty state */}
        {sections.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Nội dung đang được cập nhật. Vui lòng quay lại sau.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionsPage;
