/**
 * AchievementsSection - Hiển thị thành tích của người dùng trên ProfilePage
 */
import { useState, useEffect } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  AchievementBadge, 
  calculateAchievements, 
  type Achievement,
  type UserStatsForAchievements 
} from '@/components/ui/AchievementBadge';

interface AchievementsSectionProps {
  userId: string;
}

export function AchievementsSection({ userId }: AchievementsSectionProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<UserStatsForAchievements | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        // Get user stats from question_history
        const { data: historyData, error: historyError } = await supabase
          .from('question_history')
          .select('is_correct, answered_at')
          .eq('user_id', userId);

        if (historyError) throw historyError;

        const history = historyData || [];
        const total_attempts = history.length;
        const correct_count = history.filter(h => h.is_correct).length;
        const accuracy_percent = total_attempts > 0 ? (correct_count / total_attempts) * 100 : 0;

        // Calculate streak (consecutive days in last 30 days)
        const today = new Date();
        const last30Days = new Set<string>();
        history.forEach(h => {
          const date = new Date(h.answered_at);
          const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 30) {
            last30Days.add(date.toISOString().split('T')[0]);
          }
        });
        const streak_days = last30Days.size;

        // Calculate improvement (compare last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        const recentHistory = history.filter(h => new Date(h.answered_at) >= sevenDaysAgo);
        const olderHistory = history.filter(h => {
          const date = new Date(h.answered_at);
          return date >= fourteenDaysAgo && date < sevenDaysAgo;
        });

        let improvement_percent = 0;
        if (recentHistory.length > 0 && olderHistory.length > 0) {
          const recentAccuracy = recentHistory.filter(h => h.is_correct).length / recentHistory.length * 100;
          const olderAccuracy = olderHistory.filter(h => h.is_correct).length / olderHistory.length * 100;
          improvement_percent = recentAccuracy - olderAccuracy;
        }

        const userStats: UserStatsForAchievements = {
          total_attempts,
          correct_count,
          accuracy_percent,
          streak_days,
          improvement_percent,
        };

        setStats(userStats);
        setAchievements(calculateAchievements(userStats));
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadStats();
    }
  }, [userId]);

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount = achievements.length;

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">Thành tích</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {earnedCount}/{totalCount} đạt được
          </span>
        </div>
        <CardDescription>
          Huy hiệu ghi nhận những mốc quan trọng trong hành trình học tập của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total_attempts}</p>
              <p className="text-xs text-muted-foreground">Câu đã làm</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.accuracy_percent.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Tỷ lệ đúng</p>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.streak_days}</p>
              <p className="text-xs text-muted-foreground">Ngày hoạt động</p>
            </div>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3 text-center">
              <p className={`text-2xl font-bold ${stats.improvement_percent >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                {stats.improvement_percent > 0 ? '+' : ''}{stats.improvement_percent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Cải thiện</p>
            </div>
          </div>
        )}

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                achievement.earned
                  ? 'bg-gradient-to-b from-primary/5 to-transparent border-primary/20 shadow-sm'
                  : 'bg-muted/30 border-transparent opacity-60'
              }`}
            >
              <AchievementBadge achievement={achievement} size="lg" showTooltip={false} />
              <div className="text-center">
                <p className={`text-xs font-medium ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {achievement.name}
                </p>
                {!achievement.earned && achievement.progress !== undefined && (
                  <div className="mt-1 w-full">
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-primary/50"
                        style={{ width: `${Math.min(achievement.progress, 100)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {achievement.progress.toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Motivation */}
        {earnedCount === 0 && (
          <div className="mt-4 rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              🎯 Bắt đầu luyện tập để mở khóa các huy hiệu đầu tiên!
            </p>
          </div>
        )}
        {earnedCount > 0 && earnedCount < totalCount && (
          <div className="mt-4 rounded-lg bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              🚀 Tiếp tục luyện tập để mở khóa thêm {totalCount - earnedCount} huy hiệu còn lại!
            </p>
          </div>
        )}
        {earnedCount === totalCount && (
          <div className="mt-4 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/20 p-4 text-center">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              🏆 Tuyệt vời! Bạn đã đạt được tất cả các huy hiệu!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
