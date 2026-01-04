import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  has_levels: boolean;
}

interface SubjectManagerProps {
  subjects: Subject[];
  onSubjectCreated: (subject: Subject) => void;
}

export function SubjectManager({ subjects, onSubjectCreated }: SubjectManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasLevels, setHasLevels] = useState(true);
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
      toast.error('Vui lòng nhập tên môn học');
      return;
    }

    setIsLoading(true);
    try {
      const slug = createSlug(name);
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: name.trim(),
          slug,
          description: description.trim() || null,
          has_levels: hasLevels,
        })
        .select()
        .single();

      if (error) throw error;

      onSubjectCreated(data);
      setName('');
      setDescription('');
      setHasLevels(true);
      setIsAdding(false);
      toast.success('Đã tạo môn học mới');
    } catch (err: any) {
      console.error('Error creating subject:', err);
      toast.error(err.message || 'Lỗi khi tạo môn học');
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
        Thêm môn học
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-foreground">Thêm môn học mới</span>
        <button
          onClick={() => setIsAdding(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <Input
          placeholder="Tên môn học (VD: Tiếng Nhật)"
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="has-levels"
            checked={hasLevels}
            onCheckedChange={(checked) => setHasLevels(!!checked)}
            disabled={isLoading}
          />
          <label htmlFor="has-levels" className="text-sm text-muted-foreground">
            Có phân chia cấp độ (VD: N5, N4, N3...)
          </label>
        </div>
        <Button
          onClick={handleCreate}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          {isLoading ? 'Đang tạo...' : 'Tạo môn học'}
        </Button>
      </div>
    </div>
  );
}
