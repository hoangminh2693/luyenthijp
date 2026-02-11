import { Link } from 'react-router-dom';
import { 
  Target, 
  Users, 
  Heart, 
  BookOpen, 
  Award,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { useSEO } from '@/hooks/useSEO';

/**
 * AboutPage - Trang giới thiệu về website
 * Chuẩn SEO, nội dung đầy đủ
 */
const AboutPage = () => {
  useSEO({
    title: 'Giới thiệu | Luyện Đề Thi - Luyện thi trắc nghiệm tại Nhật',
    description: 'Tìm hiểu về Luyện Đề Thi - nền tảng luyện thi trực tuyến miễn phí cho người Việt tại Nhật Bản. Sứ mệnh và tính năng.',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb items={[{ label: 'Giới thiệu' }]} />
        </div>

        {/* Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Về Luyện Đề Thi
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Nền tảng luyện thi trực tuyến miễn phí, được xây dựng với mục tiêu 
            hỗ trợ cộng đồng người Việt tại Nhật Bản chuẩn bị tốt nhất cho các kỳ thi quan trọng.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <div className="flex items-center gap-2 text-primary mb-4">
                <Target className="h-5 w-5" />
                <span className="font-semibold">Sứ mệnh của chúng tôi</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Giúp người Việt tại Nhật đạt được mục tiêu học tập
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Chúng tôi hiểu rằng việc học tập và thi cử tại Nhật Bản là một thách thức lớn 
                đối với người Việt. Với lịch trình làm việc bận rộn, việc tìm thời gian và 
                tài liệu ôn tập chất lượng không hề dễ dàng.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Luyện Đề Thi được tạo ra để giải quyết vấn đề này - cung cấp một nền tảng 
                luyện thi trực tuyến miễn phí, dễ sử dụng, có thể truy cập mọi lúc mọi nơi 
                từ điện thoại hoặc máy tính.
              </p>
            </div>
            <div className="bg-muted/30 rounded-2xl p-8 border border-border">
              <div className="grid gap-4">
                {[
                  { icon: BookOpen, text: 'Hàng nghìn câu hỏi chất lượng' },
                  { icon: CheckCircle, text: 'Giải thích chi tiết cho mỗi đáp án' },
                  { icon: Award, text: 'Theo dõi tiến độ học tập' },
                  { icon: Users, text: 'Cộng đồng hỗ trợ lẫn nhau' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-foreground font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Giá trị cốt lõi
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Heart,
                title: 'Miễn phí & Mở',
                description: 'Chúng tôi cam kết giữ nền tảng miễn phí để mọi người đều có thể tiếp cận tài liệu học tập chất lượng.',
              },
              {
                icon: Target,
                title: 'Chất lượng',
                description: 'Mọi câu hỏi đều được biên soạn kỹ lưỡng, có giải thích chi tiết để người học hiểu sâu kiến thức.',
              },
              {
                icon: Users,
                title: 'Cộng đồng',
                description: 'Xây dựng cộng đồng người Việt tại Nhật hỗ trợ lẫn nhau trong việc học tập và phát triển.',
              },
            ].map((value) => (
              <div key={value.title} className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <value.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Developer Section */}
        <section className="mb-16">
          <div className="rounded-2xl bg-muted/30 border border-border p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Được phát triển bởi cộng đồng
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6">
              Luyện Đề Thi được phát triển bởi <strong>Minhbaohiemjp</strong> - một người Việt 
              đang sinh sống và làm việc tại Nhật Bản. Dự án này được xây dựng với mong muốn 
              chia sẻ và hỗ trợ cộng đồng người Việt có cùng hoàn cảnh.
            </p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              Được phát triển với <Heart className="h-4 w-4 text-destructive fill-destructive" /> cho Việt Nam - Nhật Bản
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="text-muted-foreground mb-6">
            Hãy chọn môn học và bắt đầu luyện đề ngay bây giờ
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/subjects">
              Bắt đầu luyện đề
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
