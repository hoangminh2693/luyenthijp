import { Link } from 'react-router-dom';
import { Shield, Eye, Lock, Database, Bell, UserCheck } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Header';
import { useSEO, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

/**
 * PrivacyPage - Trang chính sách bảo mật
 * Cần thiết cho Google AdSense
 */
const PrivacyPage = () => {
  useSEO({
    title: 'Chính sách bảo mật | Luyện Đề Thi',
    description: 'Chính sách bảo mật của Luyện Đề Thi. Tìm hiểu cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.',
    jsonLd: buildBreadcrumbSchema([
      { name: 'Trang chủ', url: SITE_URL },
      { name: 'Chính sách bảo mật' },
    ]),
  });
  const lastUpdated = '17/01/2025';

  const sections = [
    {
      icon: Eye,
      title: '1. Thông tin chúng tôi thu thập',
      content: `Khi sử dụng Luyện Đề Thi, chúng tôi có thể thu thập các thông tin sau:

• **Thông tin tài khoản**: Email, tên hiển thị khi bạn đăng ký tài khoản
• **Dữ liệu học tập**: Lịch sử làm bài, điểm số, tiến độ học tập
• **Thông tin thiết bị**: ID thiết bị ẩn danh để lưu tiến độ khi chưa đăng nhập
• **Cookies**: Để duy trì phiên đăng nhập và cải thiện trải nghiệm

Chúng tôi không thu thập thông tin nhạy cảm như địa chỉ nhà, số điện thoại hay thông tin tài chính.`,
    },
    {
      icon: Database,
      title: '2. Cách chúng tôi sử dụng thông tin',
      content: `Thông tin được thu thập để:

• Cung cấp và duy trì dịch vụ luyện thi
• Theo dõi và hiển thị tiến độ học tập của bạn
• Cải thiện trải nghiệm người dùng và nội dung
• Hiển thị bảng xếp hạng và thống kê
• Liên lạc khi cần thiết (nếu bạn cho phép)

Chúng tôi không bán hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại.`,
    },
    {
      icon: Lock,
      title: '3. Bảo mật thông tin',
      content: `Chúng tôi áp dụng các biện pháp bảo mật để bảo vệ thông tin của bạn:

• Sử dụng HTTPS để mã hóa truyền dữ liệu
• Mật khẩu được mã hóa và không lưu trữ dạng văn bản thuần
• Hạn chế quyền truy cập vào dữ liệu người dùng
• Cập nhật thường xuyên các biện pháp bảo mật

Tuy nhiên, không có phương thức truyền tải qua Internet nào an toàn 100%. Chúng tôi khuyến khích bạn sử dụng mật khẩu mạnh và không chia sẻ thông tin đăng nhập.`,
    },
    {
      icon: Bell,
      title: '4. Cookies và công nghệ theo dõi',
      content: `Website sử dụng cookies để:

• Duy trì phiên đăng nhập của bạn
• Ghi nhớ tùy chọn cá nhân
• Phân tích lưu lượng truy cập (Google Analytics)
• Hiển thị quảng cáo phù hợp (trong tương lai)

Bạn có thể tắt cookies trong trình duyệt, nhưng điều này có thể ảnh hưởng đến một số tính năng của website.`,
    },
    {
      icon: UserCheck,
      title: '5. Quyền của bạn',
      content: `Bạn có quyền:

• Truy cập và xem thông tin cá nhân của mình
• Yêu cầu sửa đổi thông tin không chính xác
• Yêu cầu xóa tài khoản và dữ liệu liên quan
• Hủy đăng ký nhận thông báo email

Để thực hiện các quyền này, vui lòng liên hệ chúng tôi qua trang Liên hệ.`,
    },
    {
      icon: Shield,
      title: '6. Thay đổi chính sách',
      content: `Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Mọi thay đổi sẽ được thông báo trên trang này với ngày cập nhật mới.

Việc tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận chính sách mới.

Nếu có câu hỏi về chính sách bảo mật, vui lòng liên hệ chúng tôi.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb items={[{ label: 'Chính sách bảo mật' }]} />
        </div>

        {/* Header */}
        <div className="mb-12 max-w-3xl">
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Chính sách bảo mật
          </h1>
          <p className="text-muted-foreground">
            Cập nhật lần cuối: {lastUpdated}
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Luyện Đề Thi cam kết bảo vệ quyền riêng tư của bạn. Chính sách này giải thích 
            cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn sử dụng website.
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
            Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này, vui lòng{' '}
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

export default PrivacyPage;
