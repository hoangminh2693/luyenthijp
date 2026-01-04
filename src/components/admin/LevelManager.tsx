import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Level {
  id: string;
  name: string;
  slug: string;
  subject_id: string | null;
  description: string | null;
}

interface LevelManagerProps {
  subjectId: string;
  levels: Level[];
  onLevelCreated: (level: Level) => void;
}

export function LevelManager({ subjectId, levels, onLevelCreated }: LevelManagerProps) {
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
      toast.error('Vui lòng nhập tên cấp độ');
      return;
    }

    setIsLoading(true);
    try {
      const slug = createSlug(name);
      const orderIndex = levels.filter(l => l.subject_id === subjectId).length;
      
      const { data, error } = await supabase
        .from('levels')
        .insert({
          name: name.trim(),
          slug,
          subject_id: subjectId,
          description: description.trim() || null,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      onLevelCreated(data);
      setName('');
      setDescription('');
      setIsAdding(false);
      toast.success('Đã tạo cấp độ mới');
    } catch (err: any) {
      console.error('Error creating level:', err);
      toast.error(err.message || 'Lỗi khi tạo cấp độ');
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
        Thêm cấp độ
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-foreground">Thêm cấp độ mới</span>
        <button
          onClick={() => setIsAdding(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <Input
          placeholder="Tên cấp độ (VD: N5, N4...)"
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
          {isLoading ? 'Đang tạo...' : 'Tạo cấp độ'}
        </Button>
      </div>
    </div>
  );
}
