import { Breadcrumb } from '@/components/layout/Header';
import { AlertTriangle } from 'lucide-react';
import { useSEO, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

/**
 * DisclaimerPage - Trang miễn trừ trách nhiệm
 * Cần thiết cho site giáo dục để tăng E-E-A-T và hỗ trợ AdSense
 */
const DisclaimerPage = () => {
  useSEO({
    title: 'Miễn trừ trách nhiệm | Luyện Đề Thi',
    description: 'Miễn trừ trách nhiệm của Luyện Đề Thi. Nội dung trên website được cung cấp với mục đích tham khảo và luyện tập.',
    jsonLd: buildBreadcrumbSchema([
      { name: 'Trang chủ', url: SITE_URL },
      { name: 'Miễn trừ trách nhiệm' },
    ]),
  });
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <Breadcrumb items={[{ label: 'Miễn trừ trách nhiệm' }]} />
        </div>

        <article className="mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-full bg-warning/10 p-3">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
            <h1 className="mb-0 text-3xl font-bold text-foreground">Miễn trừ trách nhiệm</h1>
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">1. Mục đích sử dụng</h2>
            <p className="text-foreground/80">
              Luyện Đề Thi là nền tảng hỗ trợ luyện tập trắc nghiệm trực tuyến miễn phí. 
              Nội dung trên website được cung cấp với mục đích tham khảo và luyện tập, 
              không thay thế cho giáo trình chính thức hay khóa học có chứng nhận.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">2. Không đảm bảo kết quả thi</h2>
            <p className="text-foreground/80">
              Việc sử dụng Luyện Đề Thi không đảm bảo rằng bạn sẽ đỗ bất kỳ kỳ thi nào. 
              Kết quả thi thực tế phụ thuộc vào nhiều yếu tố bao gồm mức độ chuẩn bị cá nhân, 
              điều kiện thi cử và nội dung đề thi thực tế. Chúng tôi khuyến khích người dùng 
              kết hợp nhiều phương pháp học tập khác nhau để đạt kết quả tốt nhất.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">3. Độ chính xác của nội dung</h2>
            <p className="text-foreground/80">
              Chúng tôi nỗ lực để đảm bảo nội dung câu hỏi và đáp án chính xác nhất có thể. 
              Tuy nhiên, có thể tồn tại sai sót trong quá trình biên soạn hoặc cập nhật. 
              Nếu bạn phát hiện lỗi, vui lòng liên hệ với chúng tôi qua trang{' '}
              <a href="/contact" className="text-primary hover:underline">Liên hệ</a> để góp phần 
              cải thiện chất lượng nội dung.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">4. Bản quyền nội dung</h2>
            <p className="text-foreground/80">
              Các câu hỏi luyện tập trên Luyện Đề Thi được biên soạn dựa trên kiến thức chung 
              và không sao chép nguyên văn từ đề thi chính thức có bản quyền. Nội dung blog 
              và hướng dẫn là sáng tạo gốc của đội ngũ biên tập.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">5. Liên kết bên ngoài</h2>
            <p className="text-foreground/80">
              Website có thể chứa liên kết tới các trang web bên ngoài. Chúng tôi không chịu 
              trách nhiệm về nội dung, chính sách bảo mật hoặc hoạt động của các trang web 
              bên thứ ba này.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Thay đổi nội dung</h2>
            <p className="text-foreground/80">
              Chúng tôi có quyền thay đổi, cập nhật hoặc xóa bất kỳ nội dung nào trên website 
              mà không cần thông báo trước. Vui lòng kiểm tra trang này định kỳ để cập nhật 
              các thay đổi mới nhất.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default DisclaimerPage;
