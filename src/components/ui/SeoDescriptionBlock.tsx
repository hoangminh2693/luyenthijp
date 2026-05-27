import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeoDescriptionBlockProps {
  title?: string;
  /** Đoạn text/HTML mô tả. Có thể null/undefined -> sẽ dùng fallback. */
  content?: string | null;
  /** Fallback khi không có nội dung tùy biến (vd subject?.description). */
  fallback?: string;
  className?: string;
}

/**
 * SeoDescriptionBlock - Khối mô tả dài hiển thị ở đầu các trang danh mục
 *
 * Mục tiêu:
 * - Tăng lượng text hữu ích trên các trang danh mục / đề thi (SEO + AdSense)
 * - Cung cấp hướng dẫn ôn luyện, ngữ cảnh cho người dùng
 *
 * Sử dụng:
 *   <SeoDescriptionBlock
 *     title="Giới thiệu BJT N3"
 *     content={section.description}
 *     fallback="Đoạn mô tả mặc định..."
 *   />
 */
export function SeoDescriptionBlock({
  title = 'Giới thiệu & hướng dẫn ôn luyện',
  content,
  fallback,
  className,
}: SeoDescriptionBlockProps) {
  const html = (content && content.trim().length > 0) ? content : fallback;
  if (!html || html.trim().length === 0) return null;

  return (
    <section
      className={cn(
        'mb-8 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm',
        className
      )}
      aria-label={title}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div
        className={cn(
          'prose prose-sm max-w-none text-foreground/85 leading-relaxed',
          '[&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_strong]:text-foreground',
          '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground',
          'whitespace-pre-line'
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
