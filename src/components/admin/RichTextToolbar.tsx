import * as React from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Highlighter,
  Type,
  Plus,
  Minus,
  Trash2,
  Columns,
  Rows,
  Merge,
  SplitSquareHorizontal,
} from "lucide-react";
import { MediaUpload } from "@/components/admin/MediaUpload";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1", "#a855f7",
];

const HIGHLIGHT_COLORS = [
  "transparent", "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca",
  "#fed7aa", "#e9d5ff", "#fbcfe8", "#ccfbf1", "#fde68a",
];

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:pointer-events-none",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

interface RichTextToolbarProps {
  editor: Editor | null;
  className?: string;
}

export function RichTextToolbar({ editor, className }: RichTextToolbarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageDialogOpen, setImageDialogOpen] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | undefined>();
  const [tableDialogOpen, setTableDialogOpen] = React.useState(false);
  const [tableSize, setTableSize] = React.useState({ rows: 3, cols: 3 });

  if (!editor) {
    return (
      <div className={cn("flex flex-wrap items-center gap-0.5 border border-border rounded-md bg-muted/30 px-2 py-1.5 opacity-50", className)}>
        <span className="text-xs text-muted-foreground px-2">Nhấp vào ô để bắt đầu chỉnh sửa</span>
      </div>
    );
  }

  const isInTable = editor.isActive("table");

  const handleInsertLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  const handleInsertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setImageDialogOpen(false);
    setImageUrl(undefined);
  };

  const handleInsertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: tableSize.rows, cols: tableSize.cols, withHeaderRow: true })
      .run();
    setTableDialogOpen(false);
    setTableSize({ rows: 3, cols: 3 });
  };

  const currentHeading = (() => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive("heading", { level: i })) return `h${i}`;
    }
    return "paragraph";
  })();

  const handleHeadingChange = (val: string) => {
    if (val === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(val.replace("h", "")) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-0.5 border border-border rounded-md bg-muted/30 px-2 py-1.5", className)}>
        {/* Heading select */}
        <Select value={currentHeading} onValueChange={handleHeadingChange}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Đoạn văn</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
            <SelectItem value="h4">Heading 4</SelectItem>
            <SelectItem value="h5">Heading 5</SelectItem>
            <SelectItem value="h6">Heading 6</SelectItem>
          </SelectContent>
        </Select>

        <ToolbarDivider />

        {/* Font size */}
        <Select
          value={editor.getAttributes("textStyle").fontSize || ""}
          onValueChange={(val) => {
            if (val === "default") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(val).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[75px] text-xs">
            <SelectValue placeholder="Cỡ chữ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Mặc định</SelectItem>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToolbarDivider />

        {/* Bold / Italic / Underline */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="In đậm (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="In nghiêng (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Gạch chân (Ctrl+U)">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" onMouseDown={(e) => e.preventDefault()} className="inline-flex items-center justify-center rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground" title="Màu chữ">
              <div className="flex flex-col items-center">
                <Type className="h-4 w-4" />
                <div className="mt-0.5 h-1 w-4 rounded-sm" style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000" }} />
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {TEXT_COLORS.map((color) => (
                <button key={color} type="button" className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => editor.chain().focus().setColor(color).run()} />
              ))}
            </div>
            <button type="button" className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => editor.chain().focus().unsetColor().run()}>Xóa màu</button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" onMouseDown={(e) => e.preventDefault()} className="inline-flex items-center justify-center rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground" title="Tô nền chữ">
              <Highlighter className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button key={color} type="button" className={cn("h-6 w-6 rounded border border-border hover:scale-110 transition-transform", color === "transparent" && "bg-[repeating-conic-gradient(#ccc_0%_25%,transparent_0%_50%)] bg-[length:8px_8px]")} style={color !== "transparent" ? { backgroundColor: color } : undefined} onClick={() => { if (color === "transparent") { editor.chain().focus().unsetHighlight().run(); } else { editor.chain().focus().toggleHighlight({ color }).run(); } }} />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Danh sách bullet (Ctrl+Shift+8)">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Danh sách đánh số (Ctrl+Shift+7)">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Căn trái (Ctrl+L)">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Căn giữa (Ctrl+E)">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Căn phải (Ctrl+R)">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton onClick={() => { const existingHref = editor.getAttributes("link").href || ""; setLinkUrl(existingHref); setLinkDialogOpen(true); }} active={editor.isActive("link")} title="Chèn liên kết (Ctrl+K)">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Image */}
        <ToolbarButton onClick={() => setImageDialogOpen(true)} title="Chèn hình ảnh">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Table */}
        <ToolbarButton onClick={() => setTableDialogOpen(true)} title="Chèn bảng">
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Table operations */}
        {isInTable && (
          <>
            <ToolbarDivider />
            <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Thêm hàng trên">
              <Plus className="h-3 w-3" /><Rows className="h-3 w-3" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Thêm hàng dưới">
              <Rows className="h-3 w-3" /><Plus className="h-3 w-3" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Thêm cột trái">
              <Plus className="h-3 w-3" /><Columns className="h-3 w-3" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Thêm cột phải">
              <Columns className="h-3 w-3" /><Plus className="h-3 w-3" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Xóa hàng">
              <Minus className="h-3 w-3" /><Rows className="h-3 w-3" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Xóa cột">
              <Minus className="h-3 w-3" /><Columns className="h-3 w-3" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().mergeCells().run()} title="Gộp ô">
              <Merge className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().splitCell().run()} title="Tách ô">
              <SplitSquareHorizontal className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Xóa bảng">
              <Trash2 className="h-4 w-4 text-destructive" />
            </ToolbarButton>
          </>
        )}

        <ToolbarDivider />

        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Hoàn tác (Ctrl+Z)">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Làm lại (Ctrl+Y)">
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Link dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chèn liên kết</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInsertLink()} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleInsertLink}>Chèn</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chèn hình ảnh</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <MediaUpload type="image" value={imageUrl} onChange={(url) => setImageUrl(url)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleInsertImage} disabled={!imageUrl}>Chèn</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table dialog */}
      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Chèn bảng</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium w-16">Hàng:</label>
              <Input type="number" min={1} max={20} value={tableSize.rows} onChange={(e) => setTableSize((s) => ({ ...s, rows: parseInt(e.target.value) || 1 }))} className="w-20" />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium w-16">Cột:</label>
              <Input type="number" min={1} max={10} value={tableSize.cols} onChange={(e) => setTableSize((s) => ({ ...s, cols: parseInt(e.target.value) || 1 }))} className="w-20" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTableDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleInsertTable}>Chèn</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
