/**
 * AchievementBadge - Huy hiệu thành tích cho người dùng
 * Hiển thị các mốc quan trọng: Top 10, 1000 câu, streak 7 ngày, accuracy 90%+
 */
import { Trophy, Flame, Target, Star, Zap, Award, Crown, Medal, TrendingUp, BookOpen } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: 'trophy' | 'flame' | 'target' | 'star' | 'zap' | 'award' | 'crown' | 'medal' | 'trending' | 'book';
  color: 'gold' | 'silver' | 'bronze' | 'fire' | 'green' | 'blue' | 'purple' | 'pink';
  earned: boolean;
  progress?: number; // 0-100
  requirement?: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
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
  gold: {
    bg: 'from-yellow-400 to-amber-500',
    glow: 'shadow-amber-400/50',
    border: 'border-yellow-300',
    text: 'text-yellow-600',
    bgLight: 'bg-yellow-50 dark:bg-yellow-950/30',
  },
  silver: {
    bg: 'from-slate-300 to-slate-400',
    glow: 'shadow-slate-400/50',
    border: 'border-slate-300',
    text: 'text-slate-600',
    bgLight: 'bg-slate-50 dark:bg-slate-950/30',
  },
  bronze: {
    bg: 'from-amber-600 to-amber-700',
    glow: 'shadow-amber-600/50',
    border: 'border-amber-500',
    text: 'text-amber-700',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
  },
  fire: {
    bg: 'from-orange-500 to-red-500',
    glow: 'shadow-orange-500/50',
    border: 'border-orange-400',
    text: 'text-orange-600',
    bgLight: 'bg-orange-50 dark:bg-orange-950/30',
  },
  green: {
    bg: 'from-green-500 to-emerald-500',
    glow: 'shadow-green-500/50',
    border: 'border-green-400',
    text: 'text-green-600',
    bgLight: 'bg-green-50 dark:bg-green-950/30',
  },
  blue: {
    bg: 'from-blue-500 to-indigo-500',
    glow: 'shadow-blue-500/50',
    border: 'border-blue-400',
    text: 'text-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
  },
  purple: {
    bg: 'from-purple-500 to-violet-500',
    glow: 'shadow-purple-500/50',
    border: 'border-purple-400',
    text: 'text-purple-600',
    bgLight: 'bg-purple-50 dark:bg-purple-950/30',
  },
  pink: {
    bg: 'from-pink-500 to-rose-500',
    glow: 'shadow-pink-500/50',
    border: 'border-pink-400',
    text: 'text-pink-600',
    bgLight: 'bg-pink-50 dark:bg-pink-950/30',
  },
};

const sizeStyles = {
  sm: { container: 'h-6 w-6', icon: 'h-3 w-3' },
  md: { container: 'h-8 w-8', icon: 'h-4 w-4' },
  lg: { container: 'h-10 w-10', icon: 'h-5 w-5' },
};

export function AchievementBadge({ 
  achievement, 
  size = 'md', 
  showTooltip = true,
  className 
}: AchievementBadgeProps) {
  const Icon = iconMap[achievement.icon];
  const colors = colorStyles[achievement.color];
  const sizes = sizeStyles[size];

  const badge = (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full transition-all duration-200',
        sizes.container,
        achievement.earned
          ? `bg-gradient-to-br ${colors.bg} shadow-lg ${colors.glow} text-white hover:scale-110`
          : 'bg-muted/50 text-muted-foreground/50 grayscale',
        className
      )}
    >
      <Icon className={sizes.icon} />
      {achievement.earned && (
        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white dark:bg-background border border-current" />
      )}
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <HoverCard openDelay={100} closeDelay={50}>
      <HoverCardTrigger asChild>
        <button className="cursor-default">{badge}</button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3" align="center">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            achievement.earned
              ? `bg-gradient-to-br ${colors.bg} text-white`
              : 'bg-muted text-muted-foreground'
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className={cn(
              'font-semibold',
              achievement.earned ? colors.text : 'text-muted-foreground'
            )}>
              {achievement.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {achievement.description}
            </p>
            {!achievement.earned && achievement.requirement && (
              <p className="text-xs text-muted-foreground/70 italic">
                Yêu cầu: {achievement.requirement}
              </p>
            )}
            {!achievement.earned && achievement.progress !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Tiến độ</span>
                  <span className="text-muted-foreground">{achievement.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className={cn('h-full rounded-full bg-gradient-to-r', colors.bg)}
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {achievement.earned && (
          <div className={cn(
            'mt-2 rounded-md py-1 px-2 text-center text-xs font-medium',
            colors.bgLight,
            colors.text
          )}>
            ✓ Đã đạt được!
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

// Achievement Badges Row - Display multiple badges
interface AchievementBadgesProps {
  achievements: Achievement[];
  showAll?: boolean; // Show unearned badges too
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AchievementBadges({ 
  achievements, 
  showAll = false, 
  maxDisplay = 5,
  size = 'sm',
  className 
}: AchievementBadgesProps) {
  const displayedAchievements = showAll 
    ? achievements.slice(0, maxDisplay)
    : achievements.filter(a => a.earned).slice(0, maxDisplay);

  const earnedCount = achievements.filter(a => a.earned).length;
  const remainingEarned = earnedCount - maxDisplay;

  if (displayedAchievements.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {displayedAchievements.map((achievement) => (
        <AchievementBadge 
          key={achievement.id} 
          achievement={achievement} 
          size={size}
        />
      ))}
      {!showAll && remainingEarned > 0 && (
        <span className="ml-1 text-xs text-muted-foreground">
          +{remainingEarned}
        </span>
      )}
    </div>
  );
}

// Helper function to calculate achievements from user stats
export interface UserStatsForAchievements {
  total_attempts: number;
  correct_count: number;
  accuracy_percent: number;
  streak_days: number;
  improvement_percent: number;
  rank?: number;
  distinct_correct?: number;
}

export function calculateAchievements(stats: UserStatsForAchievements): Achievement[] {
  const achievements: Achievement[] = [
    // Ranking achievements
    {
      id: 'top1',
      name: 'Quán quân',
      description: 'Đạt vị trí số 1 trên bảng xếp hạng',
      icon: 'crown',
      color: 'gold',
      earned: stats.rank === 1,
      requirement: 'Đứng đầu bảng xếp hạng',
    },
    {
      id: 'top3',
      name: 'Huy chương',
      description: 'Lọt vào Top 3 bảng xếp hạng',
      icon: 'medal',
      color: 'silver',
      earned: stats.rank !== undefined && stats.rank <= 3 && stats.rank > 1,
      requirement: 'Đạt Top 3',
    },
    {
      id: 'top10',
      name: 'Top 10',
      description: 'Lọt vào Top 10 bảng xếp hạng',
      icon: 'trophy',
      color: 'bronze',
      earned: stats.rank !== undefined && stats.rank <= 10 && stats.rank > 3,
      progress: stats.rank ? Math.max(0, Math.min(100, (20 - stats.rank) * 10)) : 0,
      requirement: 'Đạt Top 10',
    },
    // Streak achievements
    {
      id: 'streak7',
      name: 'Kiên trì 7 ngày',
      description: 'Luyện tập liên tục 7 ngày',
      icon: 'flame',
      color: 'fire',
      earned: stats.streak_days >= 7,
      progress: Math.min(100, (stats.streak_days / 7) * 100),
      requirement: '7 ngày liên tục',
    },
    {
      id: 'streak30',
      name: 'Siêu kiên trì',
      description: 'Luyện tập liên tục 30 ngày',
      icon: 'flame',
      color: 'purple',
      earned: stats.streak_days >= 30,
      progress: Math.min(100, (stats.streak_days / 30) * 100),
      requirement: '30 ngày liên tục',
    },
    // Question count achievements
    {
      id: 'questions100',
      name: 'Khởi đầu',
      description: 'Hoàn thành 100 câu hỏi',
      icon: 'book',
      color: 'blue',
      earned: stats.total_attempts >= 100,
      progress: Math.min(100, (stats.total_attempts / 100) * 100),
      requirement: '100 câu hỏi',
    },
    {
      id: 'questions500',
      name: 'Chăm chỉ',
      description: 'Hoàn thành 500 câu hỏi',
      icon: 'book',
      color: 'green',
      earned: stats.total_attempts >= 500,
      progress: Math.min(100, (stats.total_attempts / 500) * 100),
      requirement: '500 câu hỏi',
    },
    {
      id: 'questions1000',
      name: 'Siêu sao luyện tập',
      description: 'Hoàn thành 1000 câu hỏi',
      icon: 'star',
      color: 'gold',
      earned: stats.total_attempts >= 1000,
      progress: Math.min(100, (stats.total_attempts / 1000) * 100),
      requirement: '1000 câu hỏi',
    },
    // Accuracy achievements
    {
      id: 'accuracy80',
      name: 'Chính xác',
      description: 'Đạt tỷ lệ đúng trên 80%',
      icon: 'target',
      color: 'green',
      earned: stats.accuracy_percent >= 80 && stats.total_attempts >= 50,
      progress: Math.min(100, (stats.accuracy_percent / 80) * 100),
      requirement: '80% với ít nhất 50 câu',
    },
    {
      id: 'accuracy90',
      name: 'Cực kỳ chính xác',
      description: 'Đạt tỷ lệ đúng trên 90%',
      icon: 'target',
      color: 'purple',
      earned: stats.accuracy_percent >= 90 && stats.total_attempts >= 50,
      progress: Math.min(100, (stats.accuracy_percent / 90) * 100),
      requirement: '90% với ít nhất 50 câu',
    },
    // Improvement achievements
    {
      id: 'improvement10',
      name: 'Tiến bộ nhanh',
      description: 'Cải thiện tỷ lệ đúng thêm 10%',
      icon: 'trending',
      color: 'pink',
      earned: stats.improvement_percent >= 10,
      progress: Math.min(100, (stats.improvement_percent / 10) * 100),
      requirement: '+10% so với tuần trước',
    },
  ];

  return achievements;
}

// Quick badges for display (only earned, priority order)
export function getTopAchievements(stats: UserStatsForAchievements, max: number = 3): Achievement[] {
  const all = calculateAchievements(stats);
  const earned = all.filter(a => a.earned);
  
  // Priority order: crown > medal > trophy > accuracy > streak > questions
  const priority = ['top1', 'top3', 'top10', 'accuracy90', 'accuracy80', 'streak30', 'streak7', 'questions1000', 'questions500', 'improvement10', 'questions100'];
  
  return earned
    .sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id))
    .slice(0, max);
}
