import { Link } from 'react-router-dom';
import { 
  Target, 
  Users, 
  Heart, 
  BookOpen, 
  Award,
  CheckCircle,
  ArrowRight,
  MapPin,
  Briefcase,
  MessageCircle,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { useSEO, buildOrganizationSchema, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

const AboutPage = () => {
  useSEO({
    title: 'Giới thiệu | Luyện Đề Thi - Luyện thi trắc nghiệm tại Nhật',
    description: 'Tìm hiểu về Luyện Đề Thi - nền tảng luyện thi trực tuyến miễn phí cho người Việt tại Nhật Bản. Câu chuyện, sứ mệnh và tính năng.',
    jsonLd: [
      buildOrganizationSchema(),
      buildBreadcrumbSchema([
        { name: 'Trang chủ', url: SITE_URL },
        { name: 'Giới thiệu' },
      ]),
    ],
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
            Xin chào! Chào mừng bạn đến với luyenthi.jp
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Nền tảng luyện thi trực tuyến miễn phí, được xây dựng từ trải nghiệm thực tế 
            của một người Việt đang sinh sống và làm việc tại Nhật Bản.
          </p>
        </div>

        {/* Founder Story Section */}
        <section className="mb-16">
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <div className="flex items-center gap-3 text-primary mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Người sáng lập</h2>
            </div>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p>
                  Tôi là người sáng lập nền tảng này, hiện đang sinh sống và làm việc tại 
                  thành phố <strong className="text-foreground">Osaka, Nhật Bản</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p>
                  Công việc chính của tôi là chuyên viên tư vấn mua bán, môi giới bất động sản 
                  và bán bảo hiểm tự nguyện ô tô - xe máy, 火災保険. Trong quá trình làm việc 
                  và hỗ trợ khách hàng, tôi thường xuyên phải xử lý các hợp đồng, giấy tờ 
                  phức tạp và giao tiếp bằng tiếng Nhật chuyên ngành.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p>
                  Trải nghiệm thực tế đó giúp tôi nhận ra sâu sắc một điều: Việc làm chủ 
                  ngôn ngữ – minh chứng qua các chứng chỉ như <strong className="text-foreground">JLPT</strong> hay 
                  tiếng Nhật thương mại <strong className="text-foreground">BJT</strong> – chính là 
                  "<em>chìa khóa vàng</em>" để bạn tự tin hòa nhập, ổn định cuộc sống và 
                  nắm bắt các cơ hội phát triển sự nghiệp tại Nhật Bản.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Section */}
        <section className="mb-16">
          <div className="grid gap-8 md:grid-cols-2 items-start">
            <div>
              <div className="flex items-center gap-2 text-primary mb-4">
                <Target className="h-5 w-5" />
                <span className="font-semibold">Tại sao luyenthi.jp ra đời?</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Từ trải nghiệm thực tế đến sứ mệnh hỗ trợ cộng đồng
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Tôi từng trải qua khoảng thời gian cặm cụi tự ôn thi JLPT, BJT và cả 
                  những kỳ thi thực tế khác như thi bằng lái xe tại Nhật. Tôi hiểu rõ những 
                  khó khăn trong việc tìm kiếm một nguồn tài liệu ôn tập hệ thống và chuẩn xác.
                </p>
                <p>
                  Đó là lý do tôi kết hợp những kinh nghiệm thực tiễn của mình để tạo ra 
                  luyenthi.jp. Mục tiêu của tôi là xây dựng một không gian học tập trực quan, 
                  dễ sử dụng, nơi mọi người có thể làm quen với cấu trúc đề thi, trau dồi 
                  kiến thức và vượt qua các kỳ thi một cách hiệu quả nhất.
                </p>
                <p className="font-medium text-foreground italic border-l-4 border-primary pl-4">
                  Nền tảng này không chỉ là một kho lưu trữ đề thi, mà là người bạn đồng hành 
                  cùng bạn trên con đường chinh phục tiếng Nhật.
                </p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-2xl p-8 border border-border">
              <h3 className="font-semibold text-foreground mb-4">Tính năng nổi bật</h3>
              <div className="grid gap-4">
                {[
                  { icon: BookOpen, text: 'Hàng nghìn câu hỏi chất lượng' },
                  { icon: CheckCircle, text: 'Giải thích chi tiết cho mỗi đáp án' },
                  { icon: Award, text: 'Theo dõi tiến độ học tập' },
                  { icon: Users, text: 'Bảng xếp hạng & cộng đồng' },
                  { icon: Target, text: 'Đề thi JLPT, BJT, bằng lái xe & nhiều hơn' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
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
                description: 'Chúng tôi cam kết giữ nền tảng miễn phí để mọi người đều có thể tiếp cận tài liệu học tập chất lượng, bất kể hoàn cảnh.',
              },
              {
                icon: Target,
                title: 'Thực tiễn & Chất lượng',
                description: 'Mọi câu hỏi đều được biên soạn kỹ lưỡng dựa trên cấu trúc đề thi thực tế, có giải thích chi tiết để người học hiểu sâu kiến thức.',
              },
              {
                icon: Users,
                title: 'Cộng đồng',
                description: 'Xây dựng cộng đồng người Việt tại Nhật hỗ trợ lẫn nhau trong việc học tập và phát triển sự nghiệp.',
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

        {/* Thank You / CTA Section */}
        <section className="mb-16">
          <div className="rounded-2xl bg-muted/30 border border-border p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Cảm ơn bạn đã ghé thăm!
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-4">
              Cảm ơn bạn đã lựa chọn luyenthi.jp. Chúc bạn ôn tập thật tốt và đạt kết quả 
              cao trong các kỳ thi sắp tới!
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Được phát triển bởi Minhbaohiemjp!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/subjects">
                  Bắt đầu luyện đề
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/contact">
                  <MessageCircle className="h-5 w-5" />
                  Góp ý & Liên hệ
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
