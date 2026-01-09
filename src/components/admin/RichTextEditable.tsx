import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/richText";

export type RichTextEditableProps = {
  value: string;
  onChange: (nextHtml: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
};

/**
 * RichTextEditable
 * - contentEditable div để paste giữ định dạng (bold/underline/italic)
 * - sanitize HTML trước khi lưu state
 */
export const RichTextEditable = React.forwardRef<HTMLDivElement, RichTextEditableProps>(
  ({ value, onChange, placeholder, className, onFocus }, ref) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    // Sync từ state vào DOM khi không focus (tránh nhảy caret)
    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      if (document.activeElement === el) return;
      if ((el.innerHTML || "") !== (value || "")) {
        el.innerHTML = value || "";
      }
    }, [value]);

    const emitChange = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const sanitized = sanitizeRichText(el.innerHTML || "");
      onChange(sanitized);
    }, [onChange]);

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        const html = e.clipboardData.getData("text/html");
        const text = e.clipboardData.getData("text/plain");

        // Ưu tiên HTML để giữ định dạng
        if (html) {
          e.preventDefault();
          const safe = sanitizeRichText(html);
          document.execCommand("insertHTML", false, safe);
          // chờ DOM cập nhật rồi emit
          setTimeout(emitChange, 0);
          return;
        }

        if (text) {
          e.preventDefault();
          document.execCommand("insertText", false, text);
          setTimeout(emitChange, 0);
        }
      },
      [emitChange]
    );

    return (
      <div
        ref={innerRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onFocus={onFocus}
        onPaste={handlePaste}
        data-placeholder={placeholder || ""}
        className={cn(
          "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // placeholder
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
          className
        )}
      />
    );
  }
);

RichTextEditable.displayName = "RichTextEditable";
