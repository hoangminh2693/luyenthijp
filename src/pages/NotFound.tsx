import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/useSEO";

const NotFound = () => {
  const location = useLocation();

  useSEO({
    title: 'Không tìm thấy trang | Luyện Đề Thi',
    description: 'Trang bạn tìm kiếm không tồn tại. Hãy quay lại trang chủ hoặc chọn môn học để bắt đầu luyện thi.',
    noindex: true,
  });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-lg">
        <p className="text-7xl font-extrabold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Không tìm thấy trang
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển. 
          Hãy thử quay lại trang chủ hoặc chọn môn học để luyện thi.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Trang chủ
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/subjects">
              <BookOpen className="mr-2 h-4 w-4" />
              Chọn môn học
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
