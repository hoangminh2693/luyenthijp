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

/**
 * Sanitize HTML để có thể render an toàn bằng dangerouslySetInnerHTML.
 * Cho phép các tag/attr cơ bản để giữ in đậm, gạch chân, xuống dòng.
 */
export function sanitizeRichText(input: string): string {
  const html = input ?? '';
  const fragment = extractClipboardFragment(html);

  return DOMPurify.sanitize(fragment, {
    ALLOWED_TAGS: [
      'b',
      'strong',
      'i',
      'em',
      'u',
      'br',
      'p',
      'div',
      'span',
      'ul',
      'ol',
      'li',
      'sub',
      'sup',
      'code',
      'pre',
      'blockquote',
    ],
    ALLOWED_ATTR: ['style'],
  });
}
