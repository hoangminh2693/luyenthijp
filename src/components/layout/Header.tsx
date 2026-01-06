import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home, ChevronRight, Upload, LogIn, LogOut, User, Settings, Trophy, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Header Component - Thanh điều hướng chính của ứng dụng
 * Hiển thị logo, navigation và breadcrumb
 */
export function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const {
    user,
    profile,
    isAdmin,
    signOut
  } = useAuth();
  const handleSignOut = async () => {
    await signOut();
  };
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  return <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img src="/favicon.png" alt="Luyện Đề Thi" className="h-9 w-9 rounded-lg" />
          <span className="text-lg font-bold text-foreground">Luyện Đề Thi</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/" className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isHome ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
          <Link to="/subjects" className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname.includes('/subjects') || location.pathname.includes('/exam') || location.pathname.includes('/quiz') || location.pathname.includes('/start') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Chọn môn học</span>
          </Link>
          <Link to="/leaderboard" className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/leaderboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Xếp hạng</span>
          </Link>
          <Link to="/statistics" className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/statistics' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Thống kê</span>
          </Link>
          {isAdmin && <>
              <Link to="/manage-subjects" className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/manage-subjects' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Quản lý</span>
              </Link>
              <Link to="/import" className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${location.pathname === '/import' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Link>
            </>}

          {/* Auth */}
          {user ? <DropdownMenu>
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
                {isAdmin && <DropdownMenuItem className="gap-2 text-primary">
                    <User className="h-4 w-4" />
                    Admin
                  </DropdownMenuItem>}
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> : <Link to="/auth">
              <Button variant="outline" size="sm" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Button>
            </Link>}
        </nav>
      </div>
    </header>;
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
export function Breadcrumb({
  items
}: BreadcrumbProps) {
  return <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground transition-colors">
        Trang chủ
      </Link>
      {items.map((item, index) => <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? <Link to={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link> : <span className="text-foreground font-medium">{item.label}</span>}
        </span>)}
    </nav>;
}