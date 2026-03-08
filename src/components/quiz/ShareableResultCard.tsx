/**
 * ShareableResultCard - Chia sẻ kết quả quiz lên mạng xã hội
 */
import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Share2, Download, Facebook, Link2, Check, Award, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { QuizResult } from '@/data/quizData';

interface ShareableResultCardProps {
  result: QuizResult;
  examName: string;
}

export function ShareableResultCard({ result, examName }: ShareableResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { totalQuestions, correctAnswers, wrongAnswers, percentage } = result;

  const getResultStatus = () => {
    if (percentage >= 80) return { label: 'Xuất sắc!', color: 'text-yellow-400', gradient: 'from-yellow-400 to-amber-500' };
    if (percentage >= 60) return { label: 'Khá tốt!', color: 'text-blue-400', gradient: 'from-blue-400 to-indigo-500' };
    if (percentage >= 40) return { label: 'Cần cố gắng', color: 'text-orange-400', gradient: 'from-orange-400 to-amber-500' };
    return { label: 'Cần ôn luyện thêm', color: 'text-red-400', gradient: 'from-red-400 to-rose-500' };
  };

  const status = getResultStatus();

  const generateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    setIsGenerating(true);
    try {
      return await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#1a1a2e',
      });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: 'Lỗi', description: 'Không thể tạo hình ảnh.', variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `ket-qua-${examName.replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
    toast({ title: 'Đã tải xuống!', description: 'Hình ảnh kết quả đã được lưu.' });
  };

  const shareText = `📝 Kết quả luyện thi: ${examName}\n\n🎯 Điểm số: ${percentage}% (${correctAnswers}/${totalQuestions} câu đúng)\n${percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : '💪'} ${status.label}\n\nBạn có muốn thử sức không? 👇\n${window.location.origin}`;

  const handleCopyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({ title: 'Đã sao chép!', description: 'Dán nội dung vào bài đăng Facebook kèm ảnh đã tải.' });
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể sao chép nội dung.', variant: 'destructive' });
    }
  };

  const handleShareFacebook = () => {
    window.open('https://www.facebook.com/', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Chia sẻ kết quả
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Chia sẻ kết quả lên Facebook
          </DialogTitle>
        </DialogHeader>

        {/* Shareable Card Preview */}
        <div className="overflow-hidden rounded-xl border">
          <div
            ref={cardRef}
            className="relative overflow-hidden p-6"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
          >
            {/* Background decorations */}
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/20 to-transparent blur-2xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-gradient-to-tr from-amber-500/20 to-transparent blur-2xl" />

            {/* Header */}
            <div className="relative mb-4 text-center">
              <div className={cn(
                'mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br',
                status.gradient
              )}>
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Kết quả luyện thi</h3>
              <p className="text-sm text-white/60">{examName}</p>
            </div>

            {/* Score */}
            <div className="relative mb-4 text-center">
              <div className={cn('text-5xl font-bold', status.color)}>
                {percentage}%
              </div>
              <p className={cn('mt-1 text-sm font-semibold', status.color)}>
                {status.label}
              </p>
            </div>

            {/* Stats */}
            <div className="relative mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/10 p-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{totalQuestions}</p>
                <p className="text-[10px] text-white/60">Tổng câu hỏi</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3 text-center backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <p className="text-2xl font-bold text-green-400">{correctAnswers}</p>
                </div>
                <p className="text-[10px] text-green-400/80">Câu đúng</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3 text-center backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <p className="text-2xl font-bold text-red-400">{wrongAnswers}</p>
                </div>
                <p className="text-[10px] text-red-400/80">Câu sai</p>
              </div>
            </div>

            {/* Watermark */}
            <div className="relative flex items-center justify-between border-t border-white/10 pt-3">
              <p className="text-[10px] text-white/40">luyenthijp.lovable.app</p>
              <p className="text-[10px] text-white/40">
                {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-2 text-sm font-medium text-foreground">📌 Hướng dẫn chia sẻ:</p>
          <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
            <li>Tải ảnh kết quả về máy</li>
            <li>Sao chép nội dung chia sẻ</li>
            <li>Đăng bài lên Facebook kèm ảnh</li>
          </ol>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Đang tạo...' : '1. Tải ảnh'}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleCopyShareText}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
            {copied ? 'Đã chép' : '2. Chép text'}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleShareFacebook}
          >
            <Facebook className="h-4 w-4 text-[#1877f2]" />
            3. Facebook
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Chia sẻ kết quả kèm ảnh để bạn bè cùng thử sức! 🎯
        </p>
      </DialogContent>
    </Dialog>
  );
}
