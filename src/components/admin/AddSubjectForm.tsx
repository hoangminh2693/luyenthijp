/**
 * AddSubjectForm - Form thêm môn học mới với cấu hình Layers động
 */
import { useState } from 'react';
import { Plus, X, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LayerConfig {
  name: string;
  required: boolean;
}

interface AddSubjectFormProps {
  onClose: () => void;
  onSubjectCreated: () => void;
}

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Mẫu layers phổ biến
const LAYER_TEMPLATES = [
  {
    name: 'JLPT Style',
    description: 'Cấp độ → Kỹ năng (VD: N5 → 文字・語彙)',
    layers: [
      { name: 'Cấp độ', required: true },
      { name: 'Kỹ năng', required: true },
    ],
  },
  {
    name: 'Phần thi',
    description: 'Chỉ có 1 layer phần thi',
    layers: [{ name: 'Phần thi', required: true }],
  },
  {
    name: 'Kỹ năng → Chủ đề',
    description: 'Nghe/Đọc → Chủ đề chi tiết',
    layers: [
      { name: 'Kỹ năng', required: true },
      { name: 'Chủ đề', required: true },
    ],
  },
  {
    name: 'Tùy chỉnh',
    description: 'Tự cấu hình layers',
    layers: [],
  },
];

export function AddSubjectForm({ onClose, onSubjectCreated }: AddSubjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');
  const [layers, setLayers] = useState<LayerConfig[]>([
    { name: 'Cấp độ', required: true },
    { name: 'Kỹ năng', required: true },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const handleTemplateSelect = (index: number) => {
    setSelectedTemplate(index);
    if (LAYER_TEMPLATES[index].layers.length > 0) {
      setLayers([...LAYER_TEMPLATES[index].layers]);
    }
  };

  const addLayer = () => {
    setLayers([...layers, { name: '', required: true }]);
  };

  const removeLayer = (index: number) => {
    setLayers(layers.filter((_, i) => i !== index));
  };

  const updateLayer = (index: number, updates: Partial<LayerConfig>) => {
    setLayers(
      layers.map((layer, i) => (i === index ? { ...layer, ...updates } : layer))
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên môn học');
      return;
    }

    if (layers.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 layer phân loại');
      return;
    }

    const emptyLayer = layers.find((l) => !l.name.trim());
    if (emptyLayer) {
      toast.error('Vui lòng nhập tên cho tất cả các layers');
      return;
    }

    setSaving(true);
    try {
      // 1. Tạo subject
      const subjectSlug = createSlug(name);
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          name: name.trim(),
          slug: subjectSlug,
          description: description.trim() || null,
          icon: icon || null,
          has_levels: layers.length > 0, // Giữ tương thích
        })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // 2. Tạo các layers
      const layersToInsert = layers.map((layer, index) => ({
        subject_id: subject.id,
        name: layer.name.trim(),
        slug: createSlug(layer.name),
        order_index: index,
        required: layer.required,
      }));

      const { error: layersError } = await supabase
        .from('subject_layers')
        .insert(layersToInsert);

      if (layersError) throw layersError;

      toast.success(`Đã tạo môn học "${name}" với ${layers.length} layers`);
      onSubjectCreated();
      onClose();
    } catch (err: any) {
      console.error('Error creating subject:', err);
      toast.error(err.message || 'Lỗi khi tạo môn học');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Thêm môn học mới</h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Thông tin cơ bản */}
        <div className="space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <Label className="mb-2 block text-sm">Icon</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-16 text-center text-2xl"
                maxLength={2}
                disabled={saving}
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm">Tên môn học *</Label>
              <Input
                placeholder="VD: JLPT, BJT, Tokutei Ginou..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block text-sm">Mô tả</Label>
            <Input
              placeholder="Mô tả ngắn về môn học (tùy chọn)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Chọn template */}
        <div>
          <Label className="mb-3 block text-sm font-medium">Chọn cấu trúc phân loại</Label>
          <div className="grid grid-cols-2 gap-2">
            {LAYER_TEMPLATES.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTemplateSelect(index)}
                disabled={saving}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedTemplate === index
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="font-medium text-foreground">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cấu hình Layers */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-sm font-medium">Các tầng phân loại (Layers)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLayer}
              disabled={saving}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Thêm layer
            </Button>
          </div>

          {layers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-6 text-center text-muted-foreground">
              Chưa có layer nào. Thêm ít nhất 1 layer để phân loại câu hỏi.
            </div>
          ) : (
            <div className="space-y-2">
              {layers.map((layer, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-3"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <Input
                    placeholder={`Tên layer ${index + 1} (VD: Cấp độ, Kỹ năng...)`}
                    value={layer.name}
                    onChange={(e) => updateLayer(index, { name: e.target.value })}
                    disabled={saving}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={layer.required}
                      onCheckedChange={(checked) => updateLayer(index, { required: checked })}
                      disabled={saving}
                    />
                    <span className="text-xs text-muted-foreground">Bắt buộc</span>
                  </div>
                  {layers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeLayer(index)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {layers.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Ví dụ đường dẫn: /subjects/{createSlug(name || 'mon-hoc')}/
              {layers.map((l) => createSlug(l.name || 'layer')).join('/')}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={saving} className="w-full">
          {saving ? 'Đang tạo...' : 'Tạo môn học'}
        </Button>
      </div>
    </div>
  );
}
