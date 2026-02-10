import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Home, 
  ChevronRight, 
  Upload, 
  LogIn, 
  LogOut, 
  User, 
  Settings, 
  Trophy, 
  BarChart3, 
  FileText,
  Menu,
  X,
  GraduationCap,
  Info,
  Mail,
  Newspaper
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

/**
 * Header Component - Thanh điều hướng chính của ứng dụng
 * Chuẩn SEO, mobile-first, dễ điều hướng
 */
export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Main navigation items
  const mainNavItems = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/subjects', label: 'Luyện đề', icon: GraduationCap },
    { href: '/leaderboard', label: 'Xếp hạng', icon: Trophy },
    { href: '/statistics', label: 'Thống kê', icon: BarChart3 },
    { href: '/blog', label: 'Chia sẻ', icon: Newspaper },
    { href: '/about', label: 'Giới thiệu', icon: Info },
  ];

  // Admin navigation items
  const adminNavItems = [
    { href: '/manage-subjects', label: 'Quản lý', icon: Settings },
    { href: '/manage-questions', label: 'Câu hỏi', icon: FileText },
    { href: '/import', label: 'Import', icon: Upload },
    { href: '/manage-blog', label: 'Blog', icon: Newspaper },
  ];

  const NavLink = ({ href, label, icon: Icon, mobile = false }: { href: string; label: string; icon: React.ElementType; mobile?: boolean }) => (
    <Link
      to={href}
      onClick={() => mobile && setMobileMenuOpen(false)}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive(href)
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      } ${mobile ? 'w-full' : ''}`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img src="/favicon.png" alt="Luyện Đề Thi" className="h-9 w-9 rounded-lg" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground leading-tight">Luyện Đề Thi</span>
            <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Nền tảng luyện thi tại Nhật</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          {isAdmin && adminNavItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Right side: Auth + Mobile menu */}
        <div className="flex items-center gap-2">
          {/* Auth - Desktop & Mobile */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(profile?.display_name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile?.display_name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {profile?.display_name || 'Người dùng'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {user.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="gap-2">
                    <User className="h-4 w-4" />
                    Hồ sơ cá nhân
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem className="gap-2 text-primary">
                    <Settings className="h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Button>
            </Link>
          )}

          {/* Mobile menu button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Mở menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col gap-6 pt-6">
                {/* Logo in mobile menu */}
                <div className="flex items-center gap-2 px-2">
                  <img src="/favicon.png" alt="Luyện Đề Thi" className="h-8 w-8 rounded-lg" />
                  <span className="font-bold text-foreground">Luyện Đề Thi</span>
                </div>

                {/* Main navigation */}
                <nav className="flex flex-col gap-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Điều hướng
                  </p>
                  {mainNavItems.map((item) => (
                    <NavLink key={item.href} {...item} mobile />
                  ))}
                </nav>

                {/* Admin navigation */}
                {isAdmin && (
                  <nav className="flex flex-col gap-1">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Quản trị
                    </p>
                    {adminNavItems.map((item) => (
                      <NavLink key={item.href} {...item} mobile />
                    ))}
                  </nav>
                )}

                {/* Contact link */}
                <nav className="flex flex-col gap-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Liên hệ
                  </p>
                  <NavLink href="/contact" label="Liên hệ" icon={Mail} mobile />
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/**
 * Breadcrumb Component - Hiển thị đường dẫn điều hướng
 * Chuẩn SEO với schema markup
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
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
      <Link to="/" className="hover:text-foreground transition-colors">
        Trang chủ
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
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
