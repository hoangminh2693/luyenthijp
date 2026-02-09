/**
 * CategoryModeConfig - Cấu hình chế độ làm bài cho danh mục
 * Cho phép admin chọn: Random/Chọn số lượng câu hay Thi theo đề cố định
 */
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shuffle, ListOrdered, FileText } from 'lucide-react';

export interface CategoryModeSettings {
  allow_random: boolean;
  allow_count_selection: boolean;
  fixed_exam_mode: boolean;
}

interface CategoryModeConfigProps {
  settings: CategoryModeSettings;
  onChange: (settings: CategoryModeSettings) => void;
  disabled?: boolean;
}

export function CategoryModeConfig({ settings, onChange, disabled = false }: CategoryModeConfigProps) {
  const handleFixedExamToggle = (checked: boolean) => {
    if (checked) {
      // Fixed exam mode: disable random & count selection
      onChange({ allow_random: false, allow_count_selection: false, fixed_exam_mode: true });
    } else {
      onChange({ ...settings, fixed_exam_mode: false });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Chế độ làm bài
      </p>

      {/* Fixed Exam Mode */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="fixed-exam" className="text-sm cursor-pointer">
            Thi theo đề cố định
          </Label>
        </div>
        <Switch
          id="fixed-exam"
          checked={settings.fixed_exam_mode}
          onCheckedChange={handleFixedExamToggle}
          disabled={disabled}
        />
      </div>

      {/* Random */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="allow-random" className="text-sm cursor-pointer">
            Xáo trộn câu hỏi
          </Label>
        </div>
        <Switch
          id="allow-random"
          checked={settings.allow_random}
          onCheckedChange={(checked) => onChange({ ...settings, allow_random: checked })}
          disabled={disabled || settings.fixed_exam_mode}
        />
      </div>

      {/* Count Selection */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="allow-count" className="text-sm cursor-pointer">
            Cho phép chọn số lượng câu
          </Label>
        </div>
        <Switch
          id="allow-count"
          checked={settings.allow_count_selection}
          onCheckedChange={(checked) => onChange({ ...settings, allow_count_selection: checked })}
          disabled={disabled || settings.fixed_exam_mode}
        />
      </div>

      {settings.fixed_exam_mode && (
        <p className="text-xs text-muted-foreground italic">
          Chế độ đề cố định: câu hỏi giữ nguyên thứ tự, không xáo trộn.
        </p>
      )}
    </div>
  );
}
