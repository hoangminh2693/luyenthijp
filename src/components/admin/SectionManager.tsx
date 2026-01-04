import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  slug: string;
  level_id: string;
  description: string | null;
}

interface SectionManagerProps {
  levelId: string;
  sections: Section[];
  onSectionCreated: (section: Section) => void;
}

export function SectionManager({ levelId, sections, onSectionCreated }: SectionManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên phần');
      return;
    }

    setIsLoading(true);
    try {
      const slug = createSlug(name);
      const orderIndex = sections.filter(s => s.level_id === levelId).length;
      
      const { data, error } = await supabase
        .from('sections')
        .insert({
          name: name.trim(),
          slug,
          level_id: levelId,
          description: description.trim() || null,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      onSectionCreated(data);
      setName('');
      setDescription('');
      setIsAdding(false);
      toast.success('Đã tạo phần mới');
    } catch (err: any) {
      console.error('Error creating section:', err);
      toast.error(err.message || 'Lỗi khi tạo phần');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="gap-1"
      >
        <Plus className="h-4 w-4" />
        Thêm phần
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-foreground">Thêm phần mới</span>
        <button
          onClick={() => setIsAdding(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <Input
          placeholder="Tên phần (VD: 文字・語彙)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
        />
        <Input
          placeholder="Mô tả (tùy chọn)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />
        <Button
          onClick={handleCreate}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          {isLoading ? 'Đang tạo...' : 'Tạo phần'}
        </Button>
      </div>
    </div>
  );
}
