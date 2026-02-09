/**
 * EditDialog - Dialog chỉnh sửa môn học, danh mục
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { CategoryModeConfig, type CategoryModeSettings } from './CategoryModeConfig';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  name: string;
  description: string;
  hasLevels?: boolean;
  showHasLevels?: boolean;
  /** Show category mode settings (allow_random, fixed_exam_mode, etc.) */
  showModeConfig?: boolean;
  modeSettings?: CategoryModeSettings;
  onSave: (name: string, description: string, hasLevels?: boolean, modeSettings?: CategoryModeSettings) => Promise<void>;
  saving?: boolean;
}

export const EditDialog = ({
  open,
  onOpenChange,
  title,
  name: initialName,
  description: initialDescription,
  hasLevels: initialHasLevels,
  showHasLevels = false,
  showModeConfig = false,
  modeSettings: initialModeSettings,
  onSave,
  saving = false,
}: EditDialogProps) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [hasLevels, setHasLevels] = useState(initialHasLevels ?? true);
  const [modeSettings, setModeSettings] = useState<CategoryModeSettings>(
    initialModeSettings ?? { allow_random: true, allow_count_selection: true, fixed_exam_mode: false }
  );

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setHasLevels(initialHasLevels ?? true);
      setModeSettings(
        initialModeSettings ?? { allow_random: true, allow_count_selection: true, fixed_exam_mode: false }
      );
    }
  }, [open, initialName, initialDescription, initialHasLevels, initialModeSettings]);

  const handleSave = async () => {
    await onSave(name, description, hasLevels, modeSettings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tên
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Mô tả
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>
          {showHasLevels && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-has-levels"
                checked={hasLevels}
                onCheckedChange={(checked) => setHasLevels(!!checked)}
                disabled={saving}
              />
              <label htmlFor="edit-has-levels" className="text-sm text-muted-foreground">
                Có phân chia cấp độ
              </label>
            </div>
          )}
          {showModeConfig && (
            <CategoryModeConfig
              settings={modeSettings}
              onChange={setModeSettings}
              disabled={saving}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
