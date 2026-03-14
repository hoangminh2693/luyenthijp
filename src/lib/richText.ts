import DOMPurify from 'dompurify';

/**
 * Trích fragment HTML từ clipboard (Word/Docs thường bọc bởi StartFragment/EndFragment).
 */
export function extractClipboardFragment(html: string): string {
  const start = html.indexOf('<!--StartFragment-->');
  const end = html.indexOf('<!--EndFragment-->');
  if (start !== -1 && end !== -1 && end > start) {
    return html.slice(start + '<!--StartFragment-->'.length, end);
  }
  return html;
}

function filterStyle(style: string): string {
  // Chỉ giữ các style phục vụ định dạng cơ bản và bảng
  const ALLOWED = new Set([
    'font-weight', 
    'font-style', 
    'text-decoration', 
    'text-decoration-line',
    'text-align',
    'color',
    'background-color',
    'background',
    'font-size',
    'border',
    'border-collapse',
    'border-width',
    'border-style',
    'border-color',
    'padding',
    'vertical-align',
    'width',
    'min-width',
  ]);
  return style
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((decl) => {
      const [rawKey, ...rest] = decl.split(':');
      const key = (rawKey || '').trim().toLowerCase();
      const val = rest.join(':').trim();
      if (!key || !val) return null;
      if (!ALLOWED.has(key)) return null;
      return `${key}: ${val}`;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Sanitize HTML để có thể render an toàn bằng dangerouslySetInnerHTML.
 * Cho phép các tag/attr cơ bản để giữ in đậm, gạch chân, xuống dòng.
 */
export function sanitizeRichText(input: string): string {
  const html = input ?? '';
  const fragment = extractClipboardFragment(html);

  const sanitized = DOMPurify.sanitize(fragment, {
    ALLOWED_TAGS: [
      'b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span',
      'ul', 'ol', 'li', 'sub', 'sup', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img', 'mark',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['style', 'colspan', 'rowspan', 'href', 'target', 'rel', 'src', 'alt', 'class', 'data-color', 'align'],
  });

  // Lọc style để tránh nhúng CSS lạ
  try {
    const doc = new DOMParser().parseFromString(`<div>${sanitized}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) return sanitized;

    root.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
      const next = filterStyle(el.getAttribute('style') || '');
      if (next) el.setAttribute('style', next);
      else el.removeAttribute('style');
    });

    return root.innerHTML;
  } catch {
    return sanitized;
  }
}

