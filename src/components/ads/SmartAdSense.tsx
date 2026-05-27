import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * SmartAdSense - Wrapper an toàn cho Google AdSense
 *
 * Mục tiêu: tuân thủ chính sách AdSense "không hiển thị quảng cáo trên
 * màn hình không có nội dung của nhà xuất bản".
 *
 * Quy tắc:
 * 1. KHÔNG render quảng cáo trên các route blacklist (auth, hệ thống, admin...).
 * 2. KHÔNG render khi component cha báo `hasContent={false}` (ví dụ trang
 *    danh mục chưa có dữ liệu, kết quả trống, đang loading...).
 * 3. Chỉ inject `<ins class="adsbygoogle">` khi đủ điều kiện -> tránh
 *    "ad request without content".
 */

const ADSENSE_CLIENT = 'ca-pub-4579926932411438';

// Các tiền tố URL TUYỆT ĐỐI KHÔNG được phép hiển thị quảng cáo
const BLACKLIST_PREFIXES: string[] = [
  '/auth',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/profile',
  '/leaderboard',
  '/statistics',
  '/manage-',          // /manage-subjects, /manage-questions, /manage-blog, /manage-contact
  '/import',
  '/admin',
];

/**
 * Kiểm tra xem một path có nằm trong blacklist hay không.
 * Export để các page khác có thể tái sử dụng nếu cần.
 */
export function isAdBlacklistedPath(pathname: string): boolean {
  return BLACKLIST_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p)
  );
}

interface SmartAdSenseProps {
  /** Slot ID từ AdSense (data-ad-slot) */
  slot: string;
  /** Format: auto, rectangle, vertical, horizontal... */
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal' | 'fluid';
  /** Responsive (mặc định true) */
  responsive?: boolean;
  /** Có nội dung hữu ích để hiển thị quảng cáo? Mặc định true */
  hasContent?: boolean;
  /** Min số ký tự text quanh ad — nếu không đủ thì không render */
  minContentLength?: number;
  /** Độ dài text thực tế của trang (dùng kèm minContentLength) */
  contentLength?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SmartAdSense({
  slot,
  format = 'auto',
  responsive = true,
  hasContent = true,
  minContentLength = 0,
  contentLength,
  className,
  style,
}: SmartAdSenseProps) {
  const location = useLocation();
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  // Tính toán điều kiện hiển thị
  const blocked = isAdBlacklistedPath(location.pathname);
  const tooShort =
    minContentLength > 0 &&
    typeof contentLength === 'number' &&
    contentLength < minContentLength;
  const shouldRender = !blocked && hasContent && !tooShort;

  useEffect(() => {
    if (!shouldRender || pushedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      // @ts-expect-error - adsbygoogle do script ngoài inject
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (err) {
      // Không throw để tránh vỡ UI khi adblock hoặc script chưa load
      // eslint-disable-next-line no-console
      console.warn('[SmartAdSense] push failed:', err);
    }
  }, [shouldRender, location.pathname]);

  if (!shouldRender) return null;

  return (
    <div className={cn('my-6 w-full text-center', className)} aria-label="Quảng cáo">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
