import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/richText";
import { Bold, Italic, Underline, Table, Plus, Minus, Columns, Rows, Merge, SplitSquareHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

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
 * - context menu để chỉnh sửa bảng (hợp ô, tách ô, thêm/xóa hàng/cột)
 */
export const RichTextEditable = React.forwardRef<HTMLDivElement, RichTextEditableProps>(
  ({ value, onChange, placeholder, className, onFocus, showToolbar = true }, ref) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const [tableDialogOpen, setTableDialogOpen] = React.useState(false);
    const [splitDialogOpen, setSplitDialogOpen] = React.useState(false);
    const [tableSize, setTableSize] = React.useState({ rows: 2, cols: 2 });
    const [splitSize, setSplitSize] = React.useState({ rows: 2, cols: 1 });
    // Store selection range before opening dialog
    const savedSelectionRef = React.useRef<Range | null>(null);
    // Store clicked cell for context menu actions
    const clickedCellRef = React.useRef<HTMLTableCellElement | null>(null);
    // Track if we're inside a table for context menu
    const [isInTable, setIsInTable] = React.useState(false);

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
        if (tableDialogOpen || splitDialogOpen) return;
        if (!el.contains(document.activeElement)) {
          setIsFocused(false);
        }
      }, 150);
      emitChange();
    }, [emitChange, tableDialogOpen, splitDialogOpen]);

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

    // ============= TABLE EDITING FUNCTIONS =============

    // Find the table cell that contains the target
    const findTableCell = (target: EventTarget | null): HTMLTableCellElement | null => {
      if (!target || !(target instanceof HTMLElement)) return null;
      return target.closest('td, th') as HTMLTableCellElement | null;
    };

    // Find the table that contains the cell
    const findTable = (cell: HTMLTableCellElement | null): HTMLTableElement | null => {
      if (!cell) return null;
      return cell.closest('table') as HTMLTableElement | null;
    };

    // Get cell position in table (accounting for colspan/rowspan)
    const getCellPosition = (cell: HTMLTableCellElement): { row: number; col: number } => {
      const table = findTable(cell);
      if (!table) return { row: 0, col: 0 };

      const rows = Array.from(table.rows);
      let rowIndex = -1;
      let colIndex = -1;

      for (let r = 0; r < rows.length; r++) {
        const cells = Array.from(rows[r].cells);
        let currentCol = 0;
        
        for (let c = 0; c < cells.length; c++) {
          if (cells[c] === cell) {
            rowIndex = r;
            colIndex = currentCol;
            break;
          }
          currentCol += cells[c].colSpan || 1;
        }
        if (rowIndex >= 0) break;
      }

      return { row: rowIndex, col: colIndex };
    };

    // Handle context menu open - check if we're in a table
    const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
      const cell = findTableCell(e.target);
      clickedCellRef.current = cell;
      setIsInTable(!!cell);
    }, []);

    // Add row above
    const addRowAbove = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const row = cell.closest('tr');
      if (!row) return;

      const numCols = Array.from(row.cells).reduce((sum, c) => sum + (c.colSpan || 1), 0);
      const newRow = document.createElement('tr');
      
      for (let i = 0; i < numCols; i++) {
        const td = document.createElement('td');
        td.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
        td.innerHTML = '&nbsp;';
        newRow.appendChild(td);
      }

      row.parentNode?.insertBefore(newRow, row);
      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Add row below
    const addRowBelow = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const row = cell.closest('tr');
      if (!row) return;

      const numCols = Array.from(row.cells).reduce((sum, c) => sum + (c.colSpan || 1), 0);
      const newRow = document.createElement('tr');
      
      for (let i = 0; i < numCols; i++) {
        const td = document.createElement('td');
        td.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
        td.innerHTML = '&nbsp;';
        newRow.appendChild(td);
      }

      row.parentNode?.insertBefore(newRow, row.nextSibling);
      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Add column left
    const addColumnLeft = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const { col } = getCellPosition(cell);
      
      Array.from(table.rows).forEach(row => {
        let currentCol = 0;
        const cells = Array.from(row.cells);
        
        for (let i = 0; i < cells.length; i++) {
          if (currentCol === col) {
            const td = document.createElement('td');
            td.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
            td.innerHTML = '&nbsp;';
            cells[i].parentNode?.insertBefore(td, cells[i]);
            break;
          }
          currentCol += cells[i].colSpan || 1;
          if (currentCol > col) {
            // We're inside a colspan cell
            cells[i].colSpan = (cells[i].colSpan || 1) + 1;
            break;
          }
        }
      });

      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Add column right
    const addColumnRight = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const { col } = getCellPosition(cell);
      const cellColSpan = cell.colSpan || 1;
      const targetCol = col + cellColSpan;
      
      Array.from(table.rows).forEach(row => {
        let currentCol = 0;
        const cells = Array.from(row.cells);
        let inserted = false;
        
        for (let i = 0; i < cells.length; i++) {
          const cellSpan = cells[i].colSpan || 1;
          if (currentCol + cellSpan === targetCol) {
            const td = document.createElement('td');
            td.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
            td.innerHTML = '&nbsp;';
            cells[i].parentNode?.insertBefore(td, cells[i].nextSibling);
            inserted = true;
            break;
          }
          if (currentCol < targetCol && currentCol + cellSpan > targetCol) {
            // We're inside a colspan cell
            cells[i].colSpan = cellSpan + 1;
            inserted = true;
            break;
          }
          currentCol += cellSpan;
        }
        
        // If we didn't insert yet, add at the end
        if (!inserted) {
          const td = document.createElement('td');
          td.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
          td.innerHTML = '&nbsp;';
          row.appendChild(td);
        }
      });

      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Delete row
    const deleteRow = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const row = cell.closest('tr');
      if (!row) return;

      // Don't delete if it's the last row
      if (table.rows.length <= 1) return;

      row.remove();
      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Delete column
    const deleteColumn = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const { col } = getCellPosition(cell);
      
      Array.from(table.rows).forEach(row => {
        let currentCol = 0;
        const cells = Array.from(row.cells);
        
        for (let i = 0; i < cells.length; i++) {
          const cellSpan = cells[i].colSpan || 1;
          if (currentCol === col) {
            if (cellSpan > 1) {
              cells[i].colSpan = cellSpan - 1;
            } else {
              cells[i].remove();
            }
            break;
          }
          if (currentCol < col && currentCol + cellSpan > col) {
            // We're inside a colspan cell
            cells[i].colSpan = cellSpan - 1;
            break;
          }
          currentCol += cellSpan;
        }
      });

      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Merge selected cells (simplified - merges with right cell)
    const mergeCellRight = React.useCallback(() => {
      const cell = clickedCellRef.current;
      if (!cell) return;

      const nextCell = cell.nextElementSibling as HTMLTableCellElement;
      if (!nextCell) return;

      // Merge content and increase colspan
      const content1 = cell.innerHTML.trim();
      const content2 = nextCell.innerHTML.trim();
      cell.innerHTML = content1 + (content1 && content2 ? ' ' : '') + content2;
      cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
      nextCell.remove();

      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Merge with cell below
    const mergeCellBelow = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const { row, col } = getCellPosition(cell);
      const rows = Array.from(table.rows);
      
      if (row + 1 >= rows.length) return;

      // Find the cell below
      const nextRow = rows[row + 1];
      let currentCol = 0;
      const cells = Array.from(nextRow.cells);
      
      for (let i = 0; i < cells.length; i++) {
        if (currentCol === col) {
          // Merge content and increase rowspan
          const content1 = cell.innerHTML.trim();
          const content2 = cells[i].innerHTML.trim();
          cell.innerHTML = content1 + (content1 && content2 ? '<br>' : '') + content2;
          cell.rowSpan = (cell.rowSpan || 1) + (cells[i].rowSpan || 1);
          cells[i].remove();
          break;
        }
        currentCol += cells[i].colSpan || 1;
      }

      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Open split dialog
    const openSplitDialog = React.useCallback(() => {
      setSplitSize({ rows: 2, cols: 1 });
      setSplitDialogOpen(true);
    }, []);

    // Split cell by creating a nested table inside the cell
    const splitCell = React.useCallback((rows: number, cols: number) => {
      const cell = clickedCellRef.current;
      if (!cell) return;

      const cellContent = cell.innerHTML.trim();
      
      // Create a nested table inside the cell
      const cellStyle = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 30px;';
      let nestedTableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 0;">';
      
      for (let r = 0; r < rows; r++) {
        nestedTableHtml += '<tr>';
        for (let c = 0; c < cols; c++) {
          // Put original content in the first cell only
          const content = (r === 0 && c === 0 && cellContent && cellContent !== '&nbsp;') 
            ? cellContent 
            : '&nbsp;';
          nestedTableHtml += `<td style="${cellStyle}">${content}</td>`;
        }
        nestedTableHtml += '</tr>';
      }
      nestedTableHtml += '</table>';

      // Replace cell content with nested table
      cell.innerHTML = nestedTableHtml;
      // Remove padding from parent cell to make nested table fit nicely
      cell.style.padding = '0';

      setSplitDialogOpen(false);
      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Delete table
    const deleteTable = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!table) return;

      table.remove();
      setTimeout(emitChange, 0);
    }, [emitChange]);

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

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              ref={innerRef}
              contentEditable
              suppressContentEditableWarning
              onInput={emitChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              onContextMenu={handleContextMenu}
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
          </ContextMenuTrigger>
          
          {/* Context Menu for Table Editing */}
          <ContextMenuContent className="w-56 bg-popover">
            {isInTable ? (
              <>
                {/* Row operations */}
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="flex items-center gap-2">
                    <Rows className="h-4 w-4" />
                    <span>Hàng</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="bg-popover">
                    <ContextMenuItem onClick={addRowAbove} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Thêm hàng phía trên</span>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={addRowBelow} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Thêm hàng phía dưới</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={deleteRow} className="flex items-center gap-2 text-destructive">
                      <Minus className="h-4 w-4" />
                      <span>Xóa hàng</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>

                {/* Column operations */}
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="flex items-center gap-2">
                    <Columns className="h-4 w-4" />
                    <span>Cột</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="bg-popover">
                    <ContextMenuItem onClick={addColumnLeft} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Thêm cột bên trái</span>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={addColumnRight} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Thêm cột bên phải</span>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={deleteColumn} className="flex items-center gap-2 text-destructive">
                      <Minus className="h-4 w-4" />
                      <span>Xóa cột</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>

                <ContextMenuSeparator />

                {/* Merge operations */}
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="flex items-center gap-2">
                    <Merge className="h-4 w-4" />
                    <span>Hợp ô</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="bg-popover">
                    <ContextMenuItem onClick={mergeCellRight} className="flex items-center gap-2">
                      <span>Hợp với ô bên phải</span>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={mergeCellBelow} className="flex items-center gap-2">
                      <span>Hợp với ô bên dưới</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>

                {/* Split cell */}
                <ContextMenuItem onClick={openSplitDialog} className="flex items-center gap-2">
                  <SplitSquareHorizontal className="h-4 w-4" />
                  <span>Tách ô...</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                {/* Delete table */}
                <ContextMenuItem onClick={deleteTable} className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa bảng</span>
                </ContextMenuItem>
              </>
            ) : (
              <>
                <ContextMenuItem onClick={() => applyFormat("bold")} className="flex items-center gap-2">
                  <Bold className="h-4 w-4" />
                  <span>In đậm</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => applyFormat("italic")} className="flex items-center gap-2">
                  <Italic className="h-4 w-4" />
                  <span>In nghiêng</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => applyFormat("underline")} className="flex items-center gap-2">
                  <Underline className="h-4 w-4" />
                  <span>Gạch chân</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={openTableDialog} className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  <span>Chèn bảng</span>
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {/* Table Creation Dialog */}
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

        {/* Split Cell Dialog */}
        <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
          <DialogContent className="sm:max-w-[280px]">
            <DialogHeader>
              <DialogTitle>Tách ô</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Số hàng</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={splitSize.rows}
                    onChange={(e) => setSplitSize(prev => ({ 
                      ...prev, 
                      rows: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) 
                    }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Số cột</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={splitSize.cols}
                    onChange={(e) => setSplitSize(prev => ({ 
                      ...prev, 
                      cols: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) 
                    }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tách ô hiện tại thành {splitSize.rows} hàng × {splitSize.cols} cột
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => splitCell(splitSize.rows, splitSize.cols)}
                disabled={splitSize.rows === 1 && splitSize.cols === 1}
              >
                Tách ô
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

RichTextEditable.displayName = "RichTextEditable";
