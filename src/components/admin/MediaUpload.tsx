/**
 * MediaUpload - Component upload hình ảnh/âm thanh cho câu hỏi
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaUploadProps {
  type: 'image' | 'audio';
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export function MediaUpload({ type, value, onChange, disabled }: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = type === 'image' 
    ? 'image/jpeg,image/png,image/gif,image/webp'
    : 'audio/mpeg,audio/wav,audio/ogg,audio/mp3';

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn. Tối đa 10MB.');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('question-media')
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast.success(`Đã tải lên ${type === 'image' ? 'hình ảnh' : 'âm thanh'}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Lỗi khi tải file lên');
    } finally {
      setIsUploading(false);
    }
  }, [type, onChange]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input để có thể chọn lại cùng file
    e.target.value = '';
  }, [handleUpload]);

  const handleRemove = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const Icon = type === 'image' ? Image : Volume2;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        <div className="relative rounded-lg border border-border bg-muted/30 p-2">
          {type === 'image' ? (
            <img 
              src={value} 
              alt="Preview" 
              className="max-h-32 rounded object-contain"
            />
          ) : (
            <audio 
              src={value} 
              controls 
              className="w-full"
            />
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
          {isUploading ? 'Đang tải...' : type === 'image' ? 'Thêm hình ảnh' : 'Thêm âm thanh'}
        </Button>
      )}
    </div>
  );
}
