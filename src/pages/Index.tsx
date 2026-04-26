import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Users, 
  GraduationCap,
  Trophy,
  BarChart3,
  Target,
  Sparkles,
  Shield,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubjects, useLayersBySubject, useCategoriesByLayer } from "@/hooks/useSubjectLayers";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityWidget } from "@/components/ui/ActivityWidget";
import { useSEO, buildWebsiteSchema, buildFAQSchema, buildOrganizationSchema, SITE_URL } from "@/hooks/useSEO";

/**
 * Index Page - Trang chủ của ứng dụng luyện đề thi
 * Chuẩn SEO, content-first, sẵn sàng cho AdSense
 */
const Index = () => {
  useSEO({
    title: 'Luyện đề thi trắc nghiệm các kỳ thi tại Nhật - Luyenthi.jp',
    description: 'Nền tảng luyện thi trực tuyến miễn phí dành cho người Việt tại Nhật Bản. Luyện tập JLPT, BJT, 宅建 với hàng nghìn câu hỏi chất lượng.',
    canonical: SITE_URL,
    jsonLd: [
      buildWebsiteSchema(),
      buildOrganizationSchema(),
      buildFAQSchema([
        { question: 'Luyện Đề Thi có miễn phí không?', answer: 'Có, Luyện Đề Thi hoàn toàn miễn phí cho tất cả người dùng.' },
        { question: 'Luyện Đề Thi hỗ trợ những kỳ thi nào?', answer: 'Hiện tại hỗ trợ JLPT (N5-N1), BJT và đang mở rộng thêm các kỳ thi khác tại Nhật Bản.' },
        { question: 'Tôi có cần đăng ký tài khoản không?', answer: 'Bạn cần đăng ký tài khoản miễn phí để làm bài và lưu lịch sử học tập.' },
      ]),
    ],
  });
  const features = [
    {
      icon: GraduationCap,
      title: "Đa dạng kỳ thi",
      description: "Luyện tập các kỳ thi phổ biến tại Nhật: JLPT (N5-N1), BJT, 宅建, và nhiều chứng chỉ nghề nghiệp khác.",
    },
    {
      icon: CheckCircle,
      title: "Chấm điểm tự động",
      description: "Hệ thống chấm điểm tự động, hiển thị đáp án đúng và giải thích chi tiết cho từng câu hỏi.",
    },
    {
      icon: Clock,
      title: "Luyện tập mọi lúc",
      description: "Truy cập 24/7 từ mọi thiết bị. Phù hợp với lịch trình bận rộn của người đi làm tại Nhật.",
    },
    {
      icon: BarChart3,
      title: "Theo dõi tiến độ",
      description: "Thống kê chi tiết về tiến trình học tập, điểm mạnh/yếu để điều chỉnh phương pháp ôn luyện.",
    },
    {
      icon: Trophy,
      title: "Bảng xếp hạng",
      description: "Thi đua với cộng đồng, xem thứ hạng theo từng môn học và cấp độ để có thêm động lực.",
    },
    {
      icon: Smartphone,
      title: "Tối ưu di động",
      description: "Giao diện thân thiện với điện thoại, dễ dàng luyện tập trên tàu điện hay trong giờ nghỉ.",
    },
  ];

  // Fetch subjects từ database
  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration - subtle, không gây xao nhãng */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Miễn phí • Dễ sử dụng • Hiệu quả
            </div>

            {/* H1 - Main heading - SEO optimized */}
            <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Luyện đề thi trắc nghiệm{" "}
              <span className="text-primary">các kỳ thi tại Nhật</span>
            </h1>

            {/* Description - SEO content */}
            <p className="mb-8 text-lg text-muted-foreground md:text-xl max-w-3xl mx-auto leading-relaxed">
              Nền tảng luyện thi trực tuyến miễn phí dành cho người Việt tại Nhật Bản. 
              Luyện tập JLPT, BJT, 宅建 và nhiều kỳ thi khác với hàng nghìn câu hỏi 
              chất lượng, giải thích chi tiết và theo dõi tiến độ học tập.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2 text-base">
                <Link to="/subjects">
                  Bắt đầu luyện đề
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link to="/about">Tìm hiểu thêm</Link>
              </Button>
            </div>

            {/* Activity Widget - Hiển thị hoạt động thực */}
            <div className="mt-10">
              <ActivityWidget />
            </div>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                <span>Miễn phí hoàn toàn</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Cộng đồng người Việt tại Nhật</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-warning" />
                <span>Đề thi cập nhật thường xuyên</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exam Types Section */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Các kỳ thi được hỗ trợ
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Chúng tôi liên tục cập nhật và mở rộng ngân hàng đề thi để phục vụ 
              nhu cầu luyện tập đa dạng của cộng đồng
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loadingSubjects ? (
              // Skeleton loading
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6">
                  <Skeleton className="h-6 w-20 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : (
              subjects.map((subject) => (
                <SubjectExamCard key={subject.id} subject={subject} />
              ))
            )}
            {/* Placeholder nếu không có môn học */}
            {!loadingSubjects && subjects.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Chưa có môn học nào. Vui lòng thêm môn học trong trang quản lý.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Tại sao chọn Luyện Đề Thi?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Những tính năng được thiết kế riêng cho người Việt đang học tập và làm việc tại Nhật Bản
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
              Cách sử dụng
            </h2>
            <p className="text-muted-foreground">
              Chỉ cần 3 bước đơn giản để bắt đầu luyện tập
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: 1, title: "Chọn môn thi", desc: "Chọn kỳ thi bạn muốn luyện tập từ danh sách các môn được hỗ trợ" },
              { step: 2, title: "Chọn cấp độ & phần", desc: "Chọn cấp độ phù hợp và phần kiến thức bạn muốn tập trung ôn luyện" },
              { step: 3, title: "Làm bài & xem kết quả", desc: "Làm bài, nộp đáp án và xem kết quả với giải thích chi tiết" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-center md:p-16">
            <div className="relative z-10">
              <h2 className="mb-4 text-2xl font-bold text-primary-foreground md:text-3xl">
                Sẵn sàng bắt đầu luyện tập?
              </h2>
              <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
                Hãy chọn môn học và bắt đầu luyện đề ngay bây giờ. 
                Mỗi ngày một chút, thành công sẽ đến!
              </p>
              <Button asChild size="lg" variant="secondary" className="gap-2 text-base font-semibold">
                <Link to="/subjects">
                  <BookOpen className="h-5 w-5" />
                  Chọn môn học
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Linking Section - SEO boost */}
      <section className="border-t border-border py-12">
        <div className="container">
          <h2 className="mb-6 text-xl font-bold text-foreground">Luyện thi nhanh</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map((subject) => (
              <Link
                key={subject.id}
                to={`/subjects/${subject.slug}`}
                className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                {subject.icon} Luyện thi {subject.name}
              </Link>
            ))}
            <Link to="/blog" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors">
              📝 Kinh nghiệm ôn thi
            </Link>
            <Link to="/leaderboard" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors">
              🏆 Bảng xếp hạng
            </Link>
            <Link to="/statistics" className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors">
              📊 Thống kê học tập
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section - SEO content */}
      <section className="border-t border-border bg-muted/30 py-12">
        <div className="container max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold text-foreground text-center">Câu hỏi thường gặp</h2>
          <div className="space-y-6">
            {[
              { q: 'Luyện Đề Thi có miễn phí không?', a: 'Có, Luyện Đề Thi hoàn toàn miễn phí cho tất cả người dùng. Bạn chỉ cần đăng ký tài khoản để bắt đầu luyện tập.' },
              { q: 'Luyện Đề Thi hỗ trợ những kỳ thi nào?', a: 'Hiện tại hỗ trợ JLPT (N5-N1), BJT và đang mở rộng thêm các kỳ thi khác tại Nhật Bản như 宅建, IT Passport...' },
              { q: 'Tôi có cần đăng ký tài khoản không?', a: 'Bạn cần đăng ký tài khoản miễn phí để làm bài và lưu lịch sử học tập. Việc đăng ký rất nhanh chóng.' },
              { q: 'Đề thi có được cập nhật thường xuyên không?', a: 'Có, chúng tôi liên tục cập nhật và bổ sung đề thi mới để phục vụ nhu cầu luyện tập của cộng đồng.' },
            ].map(faq => (
              <div key={faq.q} className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad placeholder - future AdSense location */}
      <div className="container pb-8">
        {/* Ad slot placeholder - do not remove */}
      </div>
    </div>
  );
};

// Component hiển thị từng môn học với trạng thái nội dung
function SubjectExamCard({ subject }: { subject: { id: string; name: string; slug: string; description: string | null; icon: string | null } }) {
  const { data: layers = [] } = useLayersBySubject(subject.id);
  const firstLayer = layers[0];
  const { data: categories = [], isLoading } = useCategoriesByLayer(firstLayer?.id, null);
  
  const hasContent = categories.length > 0;
  
  // Tạo label hiển thị số lượng
  const getContentLabel = () => {
    if (isLoading) return null;
    if (!hasContent) return "Đang cập nhật";
    
    // Hiển thị tên các categories (VD: N5 - N1)
    if (categories.length <= 2) {
      return categories.map(c => c.name).join(" - ");
    }
    return `${categories[0]?.name} - ${categories[categories.length - 1]?.name}`;
  };

  return (
    <Link
      to={hasContent ? `/subjects/${subject.slug}` : "#"}
      className={`group rounded-xl border border-border bg-card p-6 transition-all duration-200 ${
        hasContent 
          ? "hover:border-primary/30 hover:shadow-md cursor-pointer" 
          : "opacity-70 cursor-default"
      }`}
      onClick={(e) => !hasContent && e.preventDefault()}
    >
      <div className="flex items-start gap-3">
        {subject.icon && (
          <span className="text-2xl">{subject.icon}</span>
        )}
        <div className="flex-1">
          <h3 className={`text-xl font-bold text-foreground mb-1 ${hasContent ? "group-hover:text-primary" : ""} transition-colors`}>
            {subject.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
            {subject.description || "Mô tả môn học"}
          </p>
          {isLoading ? (
            <Skeleton className="h-3 w-16" />
          ) : (
            <p className={`text-xs font-medium ${hasContent ? "text-primary" : "text-muted-foreground italic"}`}>
              {getContentLabel()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default Index;
