/**
 * ShareableAchievementCard - Card thành tích có thể chia sẻ lên mạng xã hội
 */
import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Share2, Download, Facebook, Twitter, Link2, Check, Trophy, Flame, Target, Star, Zap, Award, Crown, Medal, TrendingUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Achievement, UserStatsForAchievements } from '@/components/ui/AchievementBadge';

interface ShareableAchievementCardProps {
  achievements: Achievement[];
  stats: UserStatsForAchievements;
  displayName: string;
  avatarUrl?: string;
}

const iconMap = {
  trophy: Trophy,
  flame: Flame,
  target: Target,
  star: Star,
  zap: Zap,
  award: Award,
  crown: Crown,
  medal: Medal,
  trending: TrendingUp,
  book: BookOpen,
};

const colorStyles = {
  gold: 'from-yellow-400 to-amber-500',
  silver: 'from-slate-300 to-slate-400',
  bronze: 'from-amber-600 to-amber-700',
  fire: 'from-orange-500 to-red-500',
  green: 'from-green-500 to-emerald-500',
  blue: 'from-blue-500 to-indigo-500',
  purple: 'from-purple-500 to-violet-500',
  pink: 'from-pink-500 to-rose-500',
};

export function ShareableAchievementCard({ 
  achievements, 
  stats, 
  displayName,
  avatarUrl 
}: ShareableAchievementCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const earnedAchievements = achievements.filter(a => a.earned);
  
  const generateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#1a1a2e',
      });
      return dataUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo hình ảnh. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `thanh-tich-${displayName.replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();

    toast({
      title: 'Đã tải xuống!',
      description: 'Hình ảnh thành tích đã được lưu.',
    });
  };

  const handleShareFacebook = async () => {
    const url = encodeURIComponent(window.location.origin);
    const text = encodeURIComponent(`🏆 Tôi đã đạt được ${earnedAchievements.length} huy hiệu trên Luyện Thi JP! Bạn có muốn thử sức không?`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank', 'width=600,height=400');
  };

  const handleShareTwitter = async () => {
    const url = encodeURIComponent(window.location.origin);
    const text = encodeURIComponent(`🏆 Tôi đã đạt được ${earnedAchievements.length} huy hiệu trên Luyện Thi JP!\n\n📊 Thống kê:\n• ${stats.total_attempts} câu đã làm\n• ${stats.accuracy_percent.toFixed(1)}% độ chính xác\n• ${stats.streak_days} ngày hoạt động\n\nBạn có muốn thử sức không? 👇`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Đã sao chép!',
        description: 'Link đã được sao chép vào clipboard.',
      });
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể sao chép link.',
        variant: 'destructive',
      });
    }
  };

  if (earnedAchievements.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Chia sẻ thành tích
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Chia sẻ thành tích của bạn
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
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-gradient-to-tr from-amber-500/20 to-transparent blur-2xl" />
            
            {/* Header */}
            <div className="relative mb-4 flex items-center gap-3">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName}
                  className="h-12 w-12 rounded-full border-2 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-lg font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">{displayName}</h3>
                <p className="text-xs text-white/60">Luyện Thi JP</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="relative mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/10 p-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold text-white">{stats.total_attempts}</p>
                <p className="text-[10px] text-white/60">Câu đã làm</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold text-green-400">{stats.accuracy_percent.toFixed(1)}%</p>
                <p className="text-[10px] text-white/60">Độ chính xác</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold text-orange-400">{stats.streak_days}</p>
                <p className="text-[10px] text-white/60">Ngày hoạt động</p>
              </div>
            </div>

            {/* Achievements */}
            <div className="relative">
              <p className="mb-2 text-xs font-medium text-white/80">
                🏆 Huy hiệu đã đạt ({earnedAchievements.length}/{achievements.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {earnedAchievements.slice(0, 6).map((achievement) => {
                  const Icon = iconMap[achievement.icon];
                  return (
                    <div
                      key={achievement.id}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium text-white',
                        `bg-gradient-to-r ${colorStyles[achievement.color]}`
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {achievement.name}
                    </div>
                  );
                })}
                {earnedAchievements.length > 6 && (
                  <div className="flex items-center rounded-full bg-white/20 px-2 py-1 text-[10px] font-medium text-white">
                    +{earnedAchievements.length - 6}
                  </div>
                )}
              </div>
            </div>

            {/* Watermark */}
            <div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <p className="text-[10px] text-white/40">luyenthijp.lovable.app</p>
              <p className="text-[10px] text-white/40">
                {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Đang tạo...' : 'Tải ảnh'}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleCopyLink}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
            {copied ? 'Đã sao chép' : 'Sao chép link'}
          </Button>
          <Button
            className="gap-2 bg-[#1877f2] text-white hover:bg-[#1877f2]/90"
            onClick={handleShareFacebook}
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </Button>
          <Button
            className="gap-2 bg-black text-white hover:bg-black/90"
            onClick={handleShareTwitter}
          >
            <Twitter className="h-4 w-4" />
            X (Twitter)
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Chia sẻ thành tích để khoe với bạn bè và tạo động lực học tập! 🎯
        </p>
      </DialogContent>
    </Dialog>
  );
}
