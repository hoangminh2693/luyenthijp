import { Link } from 'react-router-dom';
import { FileText, CheckSquare, AlertTriangle, Scale, Ban, RefreshCw } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Header';
import { useSEO, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

/**
 * TermsPage - Trang điều khoản sử dụng
 * Cần thiết cho Google AdSense
 */
const TermsPage = () => {
  useSEO({
    title: 'Điều khoản sử dụng | Luyện Đề Thi',
    description: 'Điều khoản sử dụng của Luyện Đề Thi. Vui lòng đọc kỹ trước khi sử dụng dịch vụ luyện thi trắc nghiệm.',
    jsonLd: buildBreadcrumbSchema([
      { name: 'Trang chủ', url: SITE_URL },
      { name: 'Điều khoản sử dụng' },
    ]),
  });
  const lastUpdated = '17/01/2025';

  const sections = [
    {
      icon: CheckSquare,
      title: '1. Chấp nhận điều khoản',
      content: `Bằng việc truy cập và sử dụng website Luyện Đề Thi, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này.

Nếu bạn không đồng ý với bất kỳ phần nào của điều khoản này, vui lòng không sử dụng dịch vụ của chúng tôi.

Chúng tôi có quyền sửa đổi điều khoản này bất cứ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới.`,
    },
    {
      icon: FileText,
      title: '2. Mô tả dịch vụ',
      content: `Luyện Đề Thi cung cấp:

• Nền tảng luyện thi trắc nghiệm trực tuyến miễn phí
• Ngân hàng câu hỏi đa dạng cho các kỳ thi tại Nhật Bản
• Hệ thống chấm điểm và giải thích đáp án
• Theo dõi tiến độ học tập cá nhân
• Bảng xếp hạng và thống kê

Dịch vụ được cung cấp "như hiện có" và có thể thay đổi hoặc ngừng cung cấp mà không cần thông báo trước.`,
    },
    {
      icon: Scale,
      title: '3. Quy tắc sử dụng',
      content: `Khi sử dụng dịch vụ, bạn đồng ý:

• Cung cấp thông tin chính xác khi đăng ký tài khoản
• Bảo mật thông tin đăng nhập của mình
• Không chia sẻ tài khoản với người khác
• Không sử dụng công cụ tự động để truy cập hàng loạt
• Không can thiệp vào hoạt động bình thường của website
• Không sao chép hoặc phân phối nội dung mà không có sự cho phép
• Tôn trọng cộng đồng và người dùng khác`,
    },
    {
      icon: Ban,
      title: '4. Hành vi bị cấm',
      content: `Bạn không được:

• Sử dụng dịch vụ cho mục đích bất hợp pháp
• Cố gắng truy cập trái phép vào hệ thống
• Đăng tải nội dung vi phạm pháp luật hoặc quyền sở hữu trí tuệ
• Spam hoặc quấy rối người dùng khác
• Tạo nhiều tài khoản để lạm dụng hệ thống
• Sử dụng bot hoặc script để gian lận điểm số

Vi phạm các quy tắc này có thể dẫn đến việc tài khoản bị khóa vĩnh viễn.`,
    },
    {
      icon: AlertTriangle,
      title: '5. Giới hạn trách nhiệm',
      content: `Luyện Đề Thi không chịu trách nhiệm về:

• Độ chính xác tuyệt đối của nội dung câu hỏi
• Kết quả thi thực tế của người dùng
• Gián đoạn dịch vụ do lỗi kỹ thuật hoặc bảo trì
• Mất mát dữ liệu do các yếu tố ngoài tầm kiểm soát
• Nội dung từ các liên kết bên ngoài

Nội dung luyện thi chỉ mang tính chất tham khảo. Người dùng nên kết hợp với các nguồn tài liệu chính thức.`,
    },
    {
      icon: RefreshCw,
      title: '6. Quyền sở hữu trí tuệ',
      content: `Mọi nội dung trên website bao gồm:

• Giao diện, thiết kế và logo
• Câu hỏi và giải thích
• Văn bản, hình ảnh và đồ họa
• Mã nguồn và phần mềm

đều thuộc sở hữu của Luyện Đề Thi hoặc các bên cấp phép. Bạn không được sao chép, phân phối hoặc sử dụng cho mục đích thương mại mà không có sự cho phép bằng văn bản.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb items={[{ label: 'Điều khoản sử dụng' }]} />
        </div>

        {/* Header */}
        <div className="mb-12 max-w-3xl">
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Điều khoản sử dụng
          </h1>
          <p className="text-muted-foreground">
            Cập nhật lần cuối: {lastUpdated}
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Vui lòng đọc kỹ các điều khoản và điều kiện trước khi sử dụng website Luyện Đề Thi. 
            Việc sử dụng dịch vụ đồng nghĩa với việc bạn đã đọc, hiểu và đồng ý với các điều khoản này.
          </p>
        </div>

        {/* Content sections */}
        <div className="max-w-3xl space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <section.icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line pl-14">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Contact note */}
        <div className="mt-12 max-w-3xl rounded-xl bg-muted/30 border border-border p-6">
          <p className="text-muted-foreground">
            Nếu bạn có bất kỳ câu hỏi nào về điều khoản sử dụng này, vui lòng{' '}
            <Link to="/contact" className="text-primary hover:underline font-medium">
              liên hệ với chúng tôi
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
