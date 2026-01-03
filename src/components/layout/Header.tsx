import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home, ChevronRight } from 'lucide-react';

/**
 * Header Component - Thanh điều hướng chính của ứng dụng
 * Hiển thị logo, navigation và breadcrumb
 */
export function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-foreground">
            Luyện Đề Thi
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isHome
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </Link>
          <Link
            to="/subjects"
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              location.pathname.includes('/subjects') || location.pathname.includes('/exam')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Chọn môn học
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * Breadcrumb Component - Hiển thị đường dẫn điều hướng
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground transition-colors">
        Trang chủ
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link to={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
