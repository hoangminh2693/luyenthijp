import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Index Page - Trang chủ của ứng dụng luyện đề thi
 */
const Index = () => {
  const features = [{
    icon: BookOpen,
    title: 'Đa dạng môn học',
    description: 'Nhiều môn học khác nhau từ Toán, Lý, Hóa và nhiều môn khác'
  }, {
    icon: CheckCircle,
    title: 'Chấm điểm tự động',
    description: 'Xem kết quả ngay lập tức sau khi hoàn thành bài thi'
  }, {
    icon: Clock,
    title: 'Luyện tập mọi lúc',
    description: 'Truy cập và luyện tập bất cứ khi nào bạn muốn'
  }];
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="container py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary animate-fade-in-up">
              <Users className="h-4 w-4" />
              Nền tảng luyện đề thi trực tuyến
            </div>

            {/* Heading */}
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl animate-fade-in-up opacity-0 stagger-1">
              Luyện đề thi trắc nghiệm{' '}
              <span className="text-gradient">hiệu quả</span>
            </h1>

            {/* Description */}
            <p className="mb-8 text-lg text-muted-foreground md:text-xl animate-fade-in-up opacity-0 stagger-2">
              Hệ thống luyện đề thi trắc nghiệm đa dạng môn học, giúp bạn ôn tập 
              và chuẩn bị tốt nhất cho các kỳ thi quan trọng.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-fade-in-up opacity-0 stagger-3">
              <Button asChild size="lg" className="gap-2 text-base">
                <Link to="/subjects">
                  Bắt đầu luyện đề
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <a href="#features">Tìm hiểu thêm</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border bg-card py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Tại sao chọn chúng tôi?
            </h2>
            <p className="text-muted-foreground">
              Những tính năng nổi bật giúp bạn học tập hiệu quả hơn
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => <div key={feature.title} className="group rounded-xl border border-border bg-background p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover animate-fade-in-up opacity-0" style={{
            animationDelay: `${index * 0.1}s`
          }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-center md:p-16">
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">Sẵn sàng bắt đầu?</h2>
              <p className="mb-8 text-primary-foreground/80">
                Chọn môn học và bắt đầu luyện đề ngay bây giờ
              </p>
              <Button asChild size="lg" variant="secondary" className="gap-2 text-base font-semibold">
                <Link to="/subjects">
                  Chọn môn học
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Decorative elements */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
          </div>
        </div>
      </section>
    </div>;
};
export default Index;