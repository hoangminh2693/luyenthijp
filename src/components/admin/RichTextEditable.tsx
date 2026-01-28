import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/richText";
import { Bold, Italic, Underline, Table, Plus, Minus, Columns, Rows, Merge, SplitSquareHorizontal, Trash2, Undo } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

export type RichTextEditableProps = {
  value: string;
  onChange: (nextHtml: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  showToolbar?: boolean;
};

// Cell selection state
interface CellSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  table: HTMLTableElement;
}

/**
 * RichTextEditable - Excel-like Table Editor
 * - Multi-cell selection with visual borders
 * - Clear merge/split functionality
 * - Excel/Sheets paste support
 * - Context menu for table operations
 */
export const RichTextEditable = React.forwardRef<HTMLDivElement, RichTextEditableProps>(
  ({ value, onChange, placeholder, className, onFocus, showToolbar = true }, ref) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const [tableDialogOpen, setTableDialogOpen] = React.useState(false);
    const [splitDialogOpen, setSplitDialogOpen] = React.useState(false);
    const [tableSize, setTableSize] = React.useState({ rows: 2, cols: 2 });
    const [splitSize, setSplitSize] = React.useState({ rows: 2, cols: 1 });
    const savedSelectionRef = React.useRef<Range | null>(null);
    const clickedCellRef = React.useRef<HTMLTableCellElement | null>(null);
    const [isInTable, setIsInTable] = React.useState(false);
    
    // Multi-cell selection state
    const [cellSelection, setCellSelection] = React.useState<CellSelection | null>(null);
    const [isSelecting, setIsSelecting] = React.useState(false);
    const selectionStartRef = React.useRef<{ row: number; col: number; table: HTMLTableElement } | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    // Sync từ state vào DOM khi không focus
    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      if (document.activeElement === el) return;
      if ((el.innerHTML || "") !== (value || "")) {
        el.innerHTML = value || "";
      }
    }, [value]);

    // Update selection highlighting
    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;

      // Clear all selection highlights
      el.querySelectorAll('[data-selected="true"]').forEach(cell => {
        (cell as HTMLElement).removeAttribute('data-selected');
        (cell as HTMLElement).style.outline = '';
        (cell as HTMLElement).style.background = '';
      });

      if (!cellSelection) return;

      const { table, startRow, startCol, endRow, endCol } = cellSelection;
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      const rows = Array.from(table.rows);
      rows.forEach((row, rowIndex) => {
        if (rowIndex < minRow || rowIndex > maxRow) return;
        
        let currentCol = 0;
        Array.from(row.cells).forEach(cell => {
          const cellColSpan = cell.colSpan || 1;
          const cellRowSpan = cell.rowSpan || 1;
          
          // Check if this cell is within selection range
          const cellEndCol = currentCol + cellColSpan - 1;
          const cellEndRow = rowIndex + cellRowSpan - 1;
          
          if (currentCol <= maxCol && cellEndCol >= minCol && rowIndex <= maxRow && cellEndRow >= minRow) {
            cell.setAttribute('data-selected', 'true');
            cell.style.outline = '2px solid hsl(var(--primary))';
            cell.style.background = 'hsl(var(--primary) / 0.1)';
          }
          
          currentCol += cellColSpan;
        });
      });
    }, [cellSelection]);

    const emitChange = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const sanitized = sanitizeRichText(el.innerHTML || "");
      onChange(sanitized);
    }, [onChange]);

    // ============= PASTE HANDLING (Excel/Sheets) =============
    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        const html = e.clipboardData.getData("text/html");
        const text = e.clipboardData.getData("text/plain");

        // Check if pasting into a table cell
        const sel = window.getSelection();
        const anchorNode = sel?.anchorNode;
        const cell = anchorNode instanceof HTMLElement 
          ? anchorNode.closest('td, th')
          : anchorNode?.parentElement?.closest('td, th');

        // If pasting tabular data (from Excel/Sheets) into an existing table
        if (cell && text && text.includes('\t')) {
          e.preventDefault();
          
          const table = cell.closest('table');
          if (!table) return;

          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length === 0) return;

          // Get starting position
          const { row: startRow, col: startCol } = getCellPosition(cell as HTMLTableCellElement);
          const rows = Array.from(table.rows);

          lines.forEach((line, lineIdx) => {
            const rowIdx = startRow + lineIdx;
            if (rowIdx >= rows.length) {
              // Add new row if needed
              const newRow = document.createElement('tr');
              const colCount = lines[0].split('\t').length;
              for (let i = 0; i < Math.max(colCount, startCol + lines[0].split('\t').length); i++) {
                const td = document.createElement('td');
                td.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
                td.innerHTML = '&nbsp;';
                newRow.appendChild(td);
              }
              table.appendChild(newRow);
            }

            const cols = line.split('\t');
            cols.forEach((content, colIdx) => {
              const targetCol = startCol + colIdx;
              const targetRow = table.rows[rowIdx];
              if (!targetRow) return;

              let currentCol = 0;
              for (let i = 0; i < targetRow.cells.length; i++) {
                if (currentCol === targetCol) {
                  targetRow.cells[i].innerHTML = content.trim() || '&nbsp;';
                  break;
                }
                currentCol += targetRow.cells[i].colSpan || 1;
              }
            });
          });

          setTimeout(emitChange, 0);
          return;
        }

        // Standard HTML/text paste
        if (html) {
          e.preventDefault();
          const safe = sanitizeRichText(html);
          document.execCommand("insertHTML", false, safe);
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

    const saveSelection = React.useCallback(() => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      }
    }, []);

    const insertTable = React.useCallback((rows: number, cols: number) => {
      const el = innerRef.current;
      if (!el) return;
      
      el.focus();
      
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
      setTimeout(() => {
        const el = innerRef.current;
        if (!el) return;
        if (tableDialogOpen || splitDialogOpen) return;
        if (!el.contains(document.activeElement)) {
          setIsFocused(false);
          setCellSelection(null);
        }
      }, 150);
      emitChange();
    }, [emitChange, tableDialogOpen, splitDialogOpen]);

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
        
        // Escape to clear selection
        if (e.key === 'Escape' && cellSelection) {
          setCellSelection(null);
        }
      },
      [applyFormat, openTableDialog, cellSelection]
    );

    // ============= TABLE HELPERS =============

    const findTableCell = (target: EventTarget | null): HTMLTableCellElement | null => {
      if (!target || !(target instanceof HTMLElement)) return null;
      return target.closest('td, th') as HTMLTableCellElement | null;
    };

    const findTable = (cell: HTMLTableCellElement | null): HTMLTableElement | null => {
      if (!cell) return null;
      return cell.closest('table') as HTMLTableElement | null;
    };

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

    // ============= MULTI-CELL SELECTION =============

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
      const cell = findTableCell(e.target);
      if (!cell) {
        setCellSelection(null);
        return;
      }

      const table = findTable(cell);
      if (!table) return;

      const pos = getCellPosition(cell);
      selectionStartRef.current = { ...pos, table };
      setIsSelecting(true);
      
      // Single cell selection on mousedown
      setCellSelection({
        startRow: pos.row,
        startCol: pos.col,
        endRow: pos.row,
        endCol: pos.col,
        table
      });
    }, []);

    const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
      if (!isSelecting || !selectionStartRef.current) return;

      const cell = findTableCell(e.target);
      if (!cell) return;

      const table = findTable(cell);
      if (table !== selectionStartRef.current.table) return;

      const pos = getCellPosition(cell);
      
      setCellSelection({
        startRow: selectionStartRef.current.row,
        startCol: selectionStartRef.current.col,
        endRow: pos.row,
        endCol: pos.col,
        table
      });
    }, [isSelecting]);

    const handleMouseUp = React.useCallback(() => {
      setIsSelecting(false);
    }, []);

    // Global mouseup listener
    React.useEffect(() => {
      const handleGlobalMouseUp = () => setIsSelecting(false);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
      const cell = findTableCell(e.target);
      clickedCellRef.current = cell;
      setIsInTable(!!cell);
    }, []);

    // ============= ROW OPERATIONS =============

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

    const deleteRow = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      const row = cell.closest('tr');
      if (!row) return;

      if (table.rows.length <= 1) {
        toast({ title: "Không thể xóa", description: "Bảng cần ít nhất 1 hàng", variant: "destructive" });
        return;
      }

      row.remove();
      setCellSelection(null);
      setTimeout(emitChange, 0);
    }, [emitChange]);

    // ============= COLUMN OPERATIONS =============

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
            cells[i].colSpan = (cells[i].colSpan || 1) + 1;
            break;
          }
        }
      });

      setTimeout(emitChange, 0);
    }, [emitChange]);

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
            cells[i].colSpan = cellSpan + 1;
            inserted = true;
            break;
          }
          currentCol += cellSpan;
        }
        
        if (!inserted) {
          const td = document.createElement('td');
          td.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
          td.innerHTML = '&nbsp;';
          row.appendChild(td);
        }
      });

      setTimeout(emitChange, 0);
    }, [emitChange]);

    const deleteColumn = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!cell || !table) return;

      // Check if this is the last column
      const firstRow = table.rows[0];
      if (firstRow && firstRow.cells.length <= 1) {
        toast({ title: "Không thể xóa", description: "Bảng cần ít nhất 1 cột", variant: "destructive" });
        return;
      }

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
            cells[i].colSpan = cellSpan - 1;
            break;
          }
          currentCol += cellSpan;
        }
      });

      setCellSelection(null);
      setTimeout(emitChange, 0);
    }, [emitChange]);

    // ============= MERGE OPERATIONS =============

    // Get selected cells info
    const getSelectedCellsInfo = React.useCallback(() => {
      if (!cellSelection) return null;

      const { table, startRow, startCol, endRow, endCol } = cellSelection;
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      const selectedCells: HTMLTableCellElement[] = [];
      const rows = Array.from(table.rows);

      rows.forEach((row, rowIndex) => {
        if (rowIndex < minRow || rowIndex > maxRow) return;
        
        let currentCol = 0;
        Array.from(row.cells).forEach(cell => {
          const cellColSpan = cell.colSpan || 1;
          const cellEndCol = currentCol + cellColSpan - 1;
          
          if (currentCol <= maxCol && cellEndCol >= minCol) {
            selectedCells.push(cell);
          }
          
          currentCol += cellColSpan;
        });
      });

      return {
        cells: selectedCells,
        minRow,
        maxRow,
        minCol,
        maxCol,
        rowCount: maxRow - minRow + 1,
        colCount: maxCol - minCol + 1
      };
    }, [cellSelection]);

    // Merge selected cells horizontally (by columns)
    const mergeHorizontal = React.useCallback(() => {
      const info = getSelectedCellsInfo();
      if (!info || info.colCount < 2 || !cellSelection) {
        toast({ title: "Chọn ít nhất 2 cột", description: "Để hợp ô theo hàng, hãy chọn nhiều ô trên cùng 1 hàng", variant: "destructive" });
        return;
      }

      const { table } = cellSelection;
      const { minRow, maxRow, minCol, maxCol } = info;
      const rows = Array.from(table.rows);

      for (let r = minRow; r <= maxRow; r++) {
        const row = rows[r];
        if (!row) continue;

        let currentCol = 0;
        const cells = Array.from(row.cells);
        let firstCellInRange: HTMLTableCellElement | null = null;
        let combinedContent: string[] = [];
        let totalColSpan = 0;
        const cellsToRemove: HTMLTableCellElement[] = [];

        for (const cell of cells) {
          const cellSpan = cell.colSpan || 1;
          const cellEndCol = currentCol + cellSpan - 1;

          if (currentCol >= minCol && cellEndCol <= maxCol) {
            if (!firstCellInRange) {
              firstCellInRange = cell;
            } else {
              cellsToRemove.push(cell);
            }
            const content = cell.innerHTML.trim();
            if (content && content !== '&nbsp;') {
              combinedContent.push(content);
            }
            totalColSpan += cellSpan;
          }

          currentCol += cellSpan;
        }

        if (firstCellInRange && totalColSpan > 1) {
          firstCellInRange.colSpan = totalColSpan;
          firstCellInRange.innerHTML = combinedContent.join(' ') || '&nbsp;';
          cellsToRemove.forEach(c => c.remove());
        }
      }

      setCellSelection(null);
      setTimeout(emitChange, 0);
      toast({ title: "Đã hợp ô", description: "Các ô đã được hợp theo hàng" });
    }, [cellSelection, getSelectedCellsInfo, emitChange]);

    // Merge selected cells vertically (by rows)
    const mergeVertical = React.useCallback(() => {
      const info = getSelectedCellsInfo();
      if (!info || info.rowCount < 2 || !cellSelection) {
        toast({ title: "Chọn ít nhất 2 hàng", description: "Để hợp ô theo cột, hãy chọn nhiều ô trên cùng 1 cột", variant: "destructive" });
        return;
      }

      const { table } = cellSelection;
      const { minRow, maxRow, minCol, maxCol } = info;
      const rows = Array.from(table.rows);

      // For each column in range
      for (let c = minCol; c <= maxCol; c++) {
        let firstCellInRange: HTMLTableCellElement | null = null;
        let combinedContent: string[] = [];
        let totalRowSpan = 0;
        const cellsToRemove: HTMLTableCellElement[] = [];

        for (let r = minRow; r <= maxRow; r++) {
          const row = rows[r];
          if (!row) continue;

          let currentCol = 0;
          for (const cell of Array.from(row.cells)) {
            const cellSpan = cell.colSpan || 1;
            
            if (currentCol === c) {
              if (!firstCellInRange) {
                firstCellInRange = cell;
              } else {
                cellsToRemove.push(cell);
              }
              const content = cell.innerHTML.trim();
              if (content && content !== '&nbsp;') {
                combinedContent.push(content);
              }
              totalRowSpan += cell.rowSpan || 1;
              break;
            }
            
            currentCol += cellSpan;
          }
        }

        if (firstCellInRange && totalRowSpan > 1) {
          firstCellInRange.rowSpan = totalRowSpan;
          firstCellInRange.innerHTML = combinedContent.join('<br>') || '&nbsp;';
          cellsToRemove.forEach(c => c.remove());
        }
      }

      setCellSelection(null);
      setTimeout(emitChange, 0);
      toast({ title: "Đã hợp ô", description: "Các ô đã được hợp theo cột" });
    }, [cellSelection, getSelectedCellsInfo, emitChange]);

    // Unmerge/split a merged cell back to individual cells
    const unmergeCells = React.useCallback(() => {
      const cell = clickedCellRef.current;
      if (!cell) return;

      const colSpan = cell.colSpan || 1;
      const rowSpan = cell.rowSpan || 1;

      if (colSpan === 1 && rowSpan === 1) {
        toast({ title: "Ô chưa được hợp", description: "Ô này không cần tách", variant: "destructive" });
        return;
      }

      const table = findTable(cell);
      if (!table) return;

      const { row: startRow, col: startCol } = getCellPosition(cell);
      const rows = Array.from(table.rows);
      const content = cell.innerHTML;

      // Reset the original cell
      cell.colSpan = 1;
      cell.rowSpan = 1;
      cell.innerHTML = content;

      // Add cells to fill the colspan in the same row
      for (let c = 1; c < colSpan; c++) {
        const newCell = document.createElement('td');
        newCell.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
        newCell.innerHTML = '&nbsp;';
        cell.after(newCell);
      }

      // Add cells to fill the rowspan in subsequent rows
      for (let r = 1; r < rowSpan; r++) {
        const targetRow = rows[startRow + r];
        if (!targetRow) continue;

        // Find position to insert
        let currentCol = 0;
        let insertBefore: HTMLTableCellElement | null = null;
        
        for (const existingCell of Array.from(targetRow.cells)) {
          if (currentCol >= startCol) {
            insertBefore = existingCell;
            break;
          }
          currentCol += existingCell.colSpan || 1;
        }

        for (let c = 0; c < colSpan; c++) {
          const newCell = document.createElement('td');
          newCell.style.cssText = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 40px;';
          newCell.innerHTML = '&nbsp;';
          
          if (insertBefore) {
            targetRow.insertBefore(newCell, insertBefore);
          } else {
            targetRow.appendChild(newCell);
          }
        }
      }

      setCellSelection(null);
      setTimeout(emitChange, 0);
      toast({ title: "Đã tách ô", description: "Ô đã được tách về trạng thái ban đầu" });
    }, [emitChange]);

    // Open split dialog for nested table
    const openSplitDialog = React.useCallback(() => {
      setSplitSize({ rows: 2, cols: 2 });
      setSplitDialogOpen(true);
    }, []);

    // Split cell into nested table
    const splitCell = React.useCallback((rows: number, cols: number) => {
      const cell = clickedCellRef.current;
      if (!cell) return;

      const textContent = cell.textContent?.trim() || '';
      const isEmptyCell = !textContent || textContent === '\u00A0';
      const cellContent = isEmptyCell ? '' : cell.innerHTML.trim();
      
      const cellStyle = 'border: 1px solid currentColor; padding: 4px 8px; min-width: 30px;';
      let nestedTableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 0;">';
      
      for (let r = 0; r < rows; r++) {
        nestedTableHtml += '<tr>';
        for (let c = 0; c < cols; c++) {
          const content = (r === 0 && c === 0 && cellContent) 
            ? cellContent 
            : '&nbsp;';
          nestedTableHtml += `<td style="${cellStyle}">${content}</td>`;
        }
        nestedTableHtml += '</tr>';
      }
      nestedTableHtml += '</table>';

      cell.innerHTML = nestedTableHtml;
      cell.style.padding = '0';

      setSplitDialogOpen(false);
      setTimeout(emitChange, 0);
    }, [emitChange]);

    const deleteTable = React.useCallback(() => {
      const cell = clickedCellRef.current;
      const table = findTable(cell);
      if (!table) return;

      table.remove();
      setCellSelection(null);
      setTimeout(emitChange, 0);
    }, [emitChange]);

    // Check if current selection can be merged
    const canMergeHorizontal = cellSelection && Math.abs(cellSelection.endCol - cellSelection.startCol) >= 1;
    const canMergeVertical = cellSelection && Math.abs(cellSelection.endRow - cellSelection.startRow) >= 1;
    const hasSelection = cellSelection && (canMergeHorizontal || canMergeVertical);

    // Check if clicked cell is merged
    const isMergedCell = clickedCellRef.current && 
      ((clickedCellRef.current.colSpan || 1) > 1 || (clickedCellRef.current.rowSpan || 1) > 1);

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

            {/* Merge buttons when cells are selected */}
            {hasSelection && (
              <>
                <div className="w-px bg-border mx-1" />
                {canMergeHorizontal && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      mergeHorizontal();
                    }}
                    title="Hợp ô theo hàng"
                  >
                    <Merge className="h-3.5 w-3.5 rotate-90" />
                  </Button>
                )}
                {canMergeVertical && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      mergeVertical();
                    }}
                    title="Hợp ô theo cột"
                  >
                    <Merge className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Selection info badge */}
        {hasSelection && (
          <div className="absolute -top-8 right-0 z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md">
            Đã chọn: {Math.abs(cellSelection!.endRow - cellSelection!.startRow) + 1} hàng × {Math.abs(cellSelection!.endCol - cellSelection!.startCol) + 1} cột
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
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              data-placeholder={placeholder || ""}
              className={cn(
                "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
                "[&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-1 [&_th]:border [&_th]:border-border [&_th]:p-1 [&_th]:font-medium",
                // Table cursor
                "[&_td]:cursor-cell [&_th]:cursor-cell",
                showToolbar && isFocused && "mt-8",
                className
              )}
            />
          </ContextMenuTrigger>
          
          <ContextMenuContent className="w-64 bg-popover">
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

                {/* Merge operations - only show when multiple cells selected */}
                {hasSelection && (
                  <>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger className="flex items-center gap-2">
                        <Merge className="h-4 w-4" />
                        <span>Hợp ô ({Math.abs(cellSelection!.endRow - cellSelection!.startRow) + 1}×{Math.abs(cellSelection!.endCol - cellSelection!.startCol) + 1})</span>
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="bg-popover">
                        {canMergeHorizontal && (
                          <ContextMenuItem onClick={mergeHorizontal} className="flex items-center gap-2">
                            <Merge className="h-4 w-4 rotate-90" />
                            <span>Hợp ô theo hàng (ngang)</span>
                          </ContextMenuItem>
                        )}
                        {canMergeVertical && (
                          <ContextMenuItem onClick={mergeVertical} className="flex items-center gap-2">
                            <Merge className="h-4 w-4" />
                            <span>Hợp ô theo cột (dọc)</span>
                          </ContextMenuItem>
                        )}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuSeparator />
                  </>
                )}

                {/* Unmerge - only show for merged cells */}
                {isMergedCell && (
                  <ContextMenuItem onClick={unmergeCells} className="flex items-center gap-2">
                    <Undo className="h-4 w-4" />
                    <span>Bỏ hợp ô (tách về ban đầu)</span>
                  </ContextMenuItem>
                )}

                {/* Split cell into nested table */}
                <ContextMenuItem onClick={openSplitDialog} className="flex items-center gap-2">
                  <SplitSquareHorizontal className="h-4 w-4" />
                  <span>Chia ô thành bảng con...</span>
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
              <DialogTitle>Chia ô thành bảng con</DialogTitle>
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
                Chia ô thành bảng {splitSize.rows} hàng × {splitSize.cols} cột bên trong
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => splitCell(splitSize.rows, splitSize.cols)}
                disabled={splitSize.rows === 1 && splitSize.cols === 1}
              >
                Chia ô
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

RichTextEditable.displayName = "RichTextEditable";
