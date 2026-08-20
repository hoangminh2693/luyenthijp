import { Link, useLocation } from 'react-router-dom';
import { Heart, Mail, BookOpen, Shield, FileText, Info, Newspaper, GraduationCap, AlertTriangle } from 'lucide-react';
import { ActivityWidget } from '@/components/ui/ActivityWidget';

/**
 * Footer Component - Chân trang của ứng dụng
 * Đầy đủ thông tin, chuẩn SEO, sẵn sàng cho AdSense
 */
export function Footer() {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  
  // Ẩn widget khi đang làm bài (route /quiz nhưng không phải kết quả)
  const isQuizInProgress = location.pathname.startsWith('/quiz');

  const quickLinks = [
    { href: '/subjects', label: 'Luyện đề thi', icon: GraduationCap },
    { href: '/leaderboard', label: 'Bảng xếp hạng', icon: BookOpen },
    { href: '/blog', label: 'Blog chia sẻ', icon: Newspaper },
    { href: '/about', label: 'Giới thiệu', icon: Info },
  ];

  const legalLinks = [
    { href: '/privacy', label: 'Chính sách bảo mật', icon: Shield },
    { href: '/terms', label: 'Điều khoản sử dụng', icon: FileText },
    { href: '/disclaimer', label: 'Miễn trừ trách nhiệm', icon: AlertTriangle },
    { href: '/contact', label: 'Liên hệ', icon: Mail },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-card">
      {/* Mobile Activity Widget - hiển thị cuối trang trước footer content */}
      {!isQuizInProgress && (
        <div className="sm:hidden border-b border-border py-3 flex justify-center bg-muted/30">
          <ActivityWidget variant="compact" />
        </div>
      )}
      
      <div className="container py-12">
        {/* Main footer content */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Description */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={import.meta.env.BASE_URL + "favicon.png"} alt="Logo Luyện Đề Thi - Nền tảng luyện thi tại Nhật" loading="lazy" className="h-10 w-10 rounded-lg" />
              <div>
                <span className="text-lg font-bold text-foreground">Luyện Đề Thi</span>
                <p className="text-xs text-muted-foreground">Nền tảng luyện thi tại Nhật</p>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-4">
              Luyện Đề Thi là nền tảng luyện thi trắc nghiệm trực tuyến miễn phí, 
              giúp người Việt tại Nhật chuẩn bị tốt nhất cho các kỳ thi quan trọng 
              như JLPT, BJT, 宅建 và nhiều chứng chỉ nghề nghiệp khác.
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              Được phát triển với
              <Heart className="h-4 w-4 text-destructive fill-destructive" />
              bởi Minhbaohiemjp
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Truy cập nhanh</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href} 
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Thông tin</h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href} 
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              © {currentYear} Luyện Đề Thi. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Bảo mật
              </Link>
              <span className="text-border">|</span>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Điều khoản
              </Link>
              <span className="text-border">|</span>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Liên hệ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
