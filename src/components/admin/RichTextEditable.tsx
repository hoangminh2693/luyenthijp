import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/richText";
import { Bold, Italic, Underline, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RichTextEditableProps = {
  value: string;
  onChange: (nextHtml: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  showToolbar?: boolean;
};

/**
 * RichTextEditable
 * - contentEditable div để paste giữ định dạng (bold/underline/italic)
 * - sanitize HTML trước khi lưu state
 * - toolbar với các nút bold/italic/underline/table
 */
export const RichTextEditable = React.forwardRef<HTMLDivElement, RichTextEditableProps>(
  ({ value, onChange, placeholder, className, onFocus, showToolbar = true }, ref) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const [tableDialogOpen, setTableDialogOpen] = React.useState(false);
    const [tableSize, setTableSize] = React.useState({ rows: 2, cols: 2 });
    // Store selection range before opening dialog
    const savedSelectionRef = React.useRef<Range | null>(null);

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

    const applyFormat = React.useCallback(
      (command: string) => {
        const el = innerRef.current;
        if (!el) return;
        el.focus();
        document.execCommand(command, false);
        setTimeout(emitChange, 0);
      },
      [emitChange]
    );

    // Generate table HTML
    const generateTableHtml = React.useCallback((rows: number, cols: number) => {
      const cellStyle = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
      let html = '<table style="border-collapse: collapse; width: 100%;">';
      for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
          html += `<td style="${cellStyle}">&nbsp;</td>`;
        }
        html += '</tr>';
      }
      html += '</table><br>';
      return html;
    }, []);

    // Save current selection before opening dialog
    const saveSelection = React.useCallback(() => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      }
    }, []);

    // Restore selection and insert table
    const insertTable = React.useCallback((rows: number, cols: number) => {
      const el = innerRef.current;
      if (!el) return;
      
      el.focus();
      
      // Restore selection if we have one
      if (savedSelectionRef.current) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRef.current);
        }
      }
      
      const tableHtml = generateTableHtml(rows, cols);
      document.execCommand("insertHTML", false, tableHtml);
      setTimeout(emitChange, 0);
      setTableDialogOpen(false);
      savedSelectionRef.current = null;
    }, [generateTableHtml, emitChange]);

    const openTableDialog = React.useCallback(() => {
      saveSelection();
      setTableDialogOpen(true);
    }, [saveSelection]);

    const handleFocus = React.useCallback(() => {
      setIsFocused(true);
      onFocus?.();
    }, [onFocus]);

    const handleBlur = React.useCallback(() => {
      // Delay để cho phép click vào toolbar hoặc dialog
      setTimeout(() => {
        const el = innerRef.current;
        if (!el) return;
        // Keep focused if dialog is open
        if (tableDialogOpen) return;
        if (!el.contains(document.activeElement)) {
          setIsFocused(false);
        }
      }, 150);
      emitChange();
    }, [emitChange, tableDialogOpen]);

    // Keyboard shortcuts for formatting
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
          switch (e.key.toLowerCase()) {
            case 'b':
              e.preventDefault();
              applyFormat('bold');
              break;
            case 'i':
              e.preventDefault();
              applyFormat('italic');
              break;
            case 'u':
              e.preventDefault();
              applyFormat('underline');
              break;
            case 't':
              e.preventDefault();
              openTableDialog();
              break;
          }
        }
      },
      [applyFormat, openTableDialog]
    );

    return (
      <div className="relative">
        {/* Toolbar */}
        {showToolbar && isFocused && (
          <div className="absolute -top-8 left-0 z-10 flex gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-md">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("bold");
              }}
              title="In đậm (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("italic");
              }}
              title="In nghiêng (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("underline");
              }}
              title="Gạch chân (Ctrl+U)"
            >
              <Underline className="h-3.5 w-3.5" />
            </Button>
            
            {/* Table insert button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => {
                e.preventDefault();
                openTableDialog();
              }}
              title="Chèn bảng (Ctrl+T)"
            >
              <Table className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div
          ref={innerRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder || ""}
          className={cn(
            "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            // placeholder
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
            // Table styles
            "[&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-1 [&_th]:border [&_th]:border-border [&_th]:p-1 [&_th]:font-medium",
            showToolbar && isFocused && "mt-8",
            className
          )}
        />

        {/* Table Dialog */}
        <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
          <DialogContent className="sm:max-w-[280px]">
            <DialogHeader>
              <DialogTitle>Chèn bảng</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Số hàng</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableSize.rows}
                    onChange={(e) => setTableSize(prev => ({ 
                      ...prev, 
                      rows: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) 
                    }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Số cột</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableSize.cols}
                    onChange={(e) => setTableSize(prev => ({ 
                      ...prev, 
                      cols: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) 
                    }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => insertTable(tableSize.rows, tableSize.cols)}
              >
                Chèn bảng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

RichTextEditable.displayName = "RichTextEditable";
