import { Heart } from 'lucide-react';

/**
 * Footer Component - Chân trang của ứng dụng
 */
export function Footer() {
  return <footer className="mt-auto border-t border-border bg-card">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Logo và mô tả */}
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="Luyện Đề Thi" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-foreground">Luyện Đề Thi</span>
          </div>

          {/* Copyright */}
          <p className="flex items-center gap-1 text-sm text-muted-foreground">Được phát triển Minhbaohiemjp với
cho Việt Nam - Nhật Bản<Heart className="h-4 w-4 text-error fill-error" />
            cho học sinh Việt Nam
          </p>
        </div>
      </div>
    </footer>;
}