import { useEffect } from 'react';

/**
 * Hook để set robots meta tag cho từng trang
 * Giúp ngăn Google index các trang không nên xuất hiện trên kết quả tìm kiếm
 */
export function useRobotsMeta(content: 'noindex, nofollow' | 'index, follow' = 'index, follow') {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    
    meta.content = content;

    return () => {
      // Reset to index on unmount so public pages don't inherit noindex
      if (meta) {
        meta.content = 'index, follow';
      }
    };
  }, [content]);
}
