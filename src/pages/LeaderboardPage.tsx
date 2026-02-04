/**
 * LeaderboardPage - Bảng xếp hạng hiện đại
 * 4 tabs: Tổng hợp, Chính xác cao, Chăm chỉ nhất, Tiến bộ nhanh
 * Công thức: Điểm = Tỷ lệ đúng (%) × √(Tổng số câu)
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Medal, Award, User, Filter, ChevronDown, ChevronRight, 
  BookOpen, Target, TrendingUp, Flame, Star, ArrowRight, Calendar,
  Zap, Clock, Sparkles, Crown, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Breadcrumb } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AchievementBadges, 
  calculateAchievements, 
  getTopAchievements,
  type UserStatsForAchievements 
} from '@/components/ui/AchievementBadge';

interface Subject {
  id: string;
  name: string;
  slug: string;
  has_levels: boolean;
}

interface Level {
  id: string;
  name: string;
  slug: string;
  subject_id: string | null;
  order_index: number | null;
}

interface UserStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_attempts: number;
  correct_count: number;
  distinct_correct: number;
  total_questions_in_level: number;
  accuracy_percent: number;
  ranking_score: number;
  streak_days: number;
  improvement_percent: number;
  level_id: string;
  level_name: string;
}

type TimeRange = 'week' | 'month' | 'all';
type LeaderboardType = 'overall' | 'accuracy' | 'diligent' | 'progress';

const LeaderboardPage = () => {
  const { user } = useAuth();
  
  // Filter states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [legacyLevels, setLegacyLevels] = useState<Level[]>([]); // Legacy levels from old system
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [activeTab, setActiveTab] = useState<LeaderboardType>('overall');
  
  // Leaderboard data
  const [leaderboardData, setLeaderboardData] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSelectedFilter, setHasSelectedFilter] = useState(false);

  // Current user stats
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserStats, setCurrentUserStats] = useState<UserStats | null>(null);
  const [distanceToTop10, setDistanceToTop10] = useState<number | null>(null);

  // Load filter data
  useEffect(() => {
    const loadFilterData = async () => {
      const [subjectsRes, legacyLevelsRes, layersRes, categoriesRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('levels').select('*').order('order_index'),
        supabase.from('subject_layers').select('*').order('order_index'),
        supabase.from('categories').select('*').order('order_index'),
      ]);

      const subjectsData = subjectsRes.data || [];
      setSubjects(subjectsData);
      setLegacyLevels(legacyLevelsRes.data || []);
      
      // Build levels from categories (first layer = level equivalent)
      const layers = layersRes.data || [];
      const categories = categoriesRes.data || [];
      
      // For each subject, find the first layer and get its root categories as "levels"
      const derivedLevels: Level[] = [];
      for (const subject of subjectsData) {
        const subjectLayers = layers.filter(l => l.subject_id === subject.id);
        if (subjectLayers.length > 0) {
          const firstLayer = subjectLayers[0];
          const layerCategories = categories.filter(c => 
            c.layer_id === firstLayer.id && c.parent_id === null
          );
          layerCategories.forEach(cat => {
            derivedLevels.push({
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              subject_id: subject.id,
              order_index: cat.order_index
            });
          });
        }
      }
      
      // Merge with legacy levels (prefer derived, fallback to legacy)
      const mergedLevels = [...derivedLevels];
      const derivedSubjectIds = new Set(derivedLevels.map(l => l.subject_id));
      legacyLevelsRes.data?.forEach(legacyLevel => {
        if (!derivedSubjectIds.has(legacyLevel.subject_id)) {
          mergedLevels.push(legacyLevel);
        }
      });
      
      setLevels(mergedLevels);
      
      // Auto-select first subject (likely Japanese/JLPT)
      if (subjectsData.length > 0 && !selectedSubjectId) {
        const japaneseSubject = subjectsData.find(s => 
          s.name.toLowerCase().includes('jlpt') || 
          s.name.toLowerCase().includes('nhật') || 
          s.name.toLowerCase().includes('japanese') ||
          s.slug.includes('tieng-nhat')
        );
        setSelectedSubjectId(japaneseSubject?.id || subjectsData[0].id);
      }
    };

    loadFilterData();
  }, []);

  // Filter levels based on subject (combine new categories + legacy levels)
  const filteredLevels = useMemo(() => {
    if (!selectedSubjectId) return [];
    
    // First try derived levels from categories
    const derivedLevels = levels.filter(l => l.subject_id === selectedSubjectId);
    if (derivedLevels.length > 0) return derivedLevels;
    
    // Fallback to legacy levels
    return legacyLevels.filter(l => l.subject_id === selectedSubjectId);
  }, [levels, legacyLevels, selectedSubjectId]);

  // Get tab description
  const getTabDescription = (tab: LeaderboardType) => {
    switch (tab) {
      case 'overall':
        return 'Xếp hạng dựa trên cả độ chính xác và sự chăm chỉ, đảm bảo công bằng cho mọi người';
      case 'accuracy':
        return 'Dành cho người học chắc – làm ít nhất 50 câu với tỷ lệ đúng cao nhất';
      case 'diligent':
        return 'Mỗi nỗ lực đều xứng đáng được ghi nhận – xếp theo tổng số câu đã làm';
      case 'progress':
        return 'So sánh bạn của hôm nay với chính bạn của ngày hôm qua';
    }
  };

  // Load leaderboard data
  useEffect(() => {
    if (!selectedSubjectId) {
      setLeaderboardData([]);
      setHasSelectedFilter(false);
      return;
    }

    setHasSelectedFilter(true);

    const loadLeaderboard = async () => {
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .rpc('get_enhanced_leaderboard', {
            p_level_id: selectedLevelId !== 'all' ? selectedLevelId : null,
            p_subject_id: selectedSubjectId,
            p_time_range: timeRange,
            p_leaderboard_type: activeTab
          });

        if (error) {
          console.error('Error loading leaderboard:', error);
          setLeaderboardData([]);
          setIsLoading(false);
          return;
        }

        const stats: UserStats[] = (data || []).map((row: any) => ({
          user_id: row.user_id,
          display_name: row.display_name || 'Người dùng ẩn danh',
          avatar_url: row.avatar_url,
          total_attempts: Number(row.total_attempts),
          correct_count: Number(row.correct_count),
          distinct_correct: Number(row.distinct_correct),
          total_questions_in_level: Number(row.total_questions_in_level),
          accuracy_percent: Number(row.accuracy_percent),
          ranking_score: Number(row.ranking_score),
          streak_days: Number(row.streak_days),
          improvement_percent: Number(row.improvement_percent),
          level_id: row.level_id,
          level_name: row.level_name,
        }));

        setLeaderboardData(stats);

        // Find current user
        if (user) {
          const userIndex = stats.findIndex(u => u.user_id === user.id);
          if (userIndex !== -1) {
            setCurrentUserRank(userIndex + 1);
            setCurrentUserStats(stats[userIndex]);
            
            if (userIndex >= 10 && stats.length > 10) {
              const top10Score = stats[9].ranking_score;
              setDistanceToTop10(Math.ceil(top10Score - stats[userIndex].ranking_score));
            } else {
              setDistanceToTop10(null);
            }
          } else {
            setCurrentUserRank(null);
            setCurrentUserStats(null);
            setDistanceToTop10(null);
          }
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setLeaderboardData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [selectedSubjectId, selectedLevelId, timeRange, activeTab, user]);

  // Render rank badge
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30">
          <Crown className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg">
          <Medal className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg">
          <Award className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
        {rank}
      </div>
    );
  };

  // Get motivational message for current user
  const getMotivationalMessage = () => {
    if (!currentUserStats || !currentUserRank) return null;
    
    if (currentUserRank <= 3) {
      return { icon: Crown, text: 'Tuyệt vời! Bạn đang ở Top 3! 🎉', color: 'text-yellow-500' };
    }
    if (currentUserRank <= 10) {
      return { icon: Star, text: `Xuất sắc! Bạn đang Top ${currentUserRank}! ⭐`, color: 'text-primary' };
    }
    if (distanceToTop10 && distanceToTop10 > 0) {
      const questionsNeeded = Math.ceil(distanceToTop10 / 10);
      return { 
        icon: Target, 
        text: `Bạn chỉ cần thêm khoảng ${questionsNeeded} câu đúng nữa để vào Top 10!`, 
        color: 'text-primary' 
      };
    }
    return { icon: Flame, text: 'Tiếp tục luyện tập để cải thiện thứ hạng!', color: 'text-orange-500' };
  };

  const motivationalMessage = getMotivationalMessage();

  // Group data by level for display
  const groupedByLevel = useMemo(() => {
    const map = new Map<string, UserStats[]>();
    leaderboardData.forEach(item => {
      if (!map.has(item.level_id)) {
        map.set(item.level_id, []);
      }
      map.get(item.level_id)!.push(item);
    });
    return Array.from(map.entries()).map(([levelId, users]) => ({
      level_id: levelId,
      level_name: users[0]?.level_name || 'Unknown',
      users: users.slice(0, 20)
    }));
  }, [leaderboardData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', href: '/' },
              { label: 'Bảng xếp hạng' },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-400/20 blur-xl"></div>
              <div className="relative rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 p-4 shadow-lg shadow-amber-500/30">
                <Trophy className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            Bảng xếp hạng
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
            Cạnh tranh lành mạnh – Tiến bộ mỗi ngày – Mỗi nỗ lực đều được ghi nhận
          </p>
        </div>

        {/* Motivation Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group border-0 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/20 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 p-3 shadow-md group-hover:scale-110 transition-transform">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Mục tiêu</p>
                <p className="font-semibold text-foreground">Chinh phục Top 10</p>
                <p className="text-sm text-muted-foreground">Nhận vinh danh</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/20 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-3 shadow-md group-hover:scale-110 transition-transform">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Thói quen</p>
                <p className="font-semibold text-foreground">Luyện tập mỗi ngày</p>
                <p className="text-sm text-muted-foreground">Tiến bộ vượt trội</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-3 shadow-md group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Theo dõi</p>
                <p className="font-semibold text-foreground">Theo dõi tiến độ</p>
                <p className="text-sm text-muted-foreground">Cải thiện liên tục</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-3 shadow-md group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Kết quả</p>
                <p className="font-semibold text-foreground">Mục tiêu rõ ràng</p>
                <p className="text-sm text-muted-foreground">Đạt điểm cao</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              Bộ lọc xếp hạng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Subject Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Môn học</label>
                <Select 
                  value={selectedSubjectId} 
                  onValueChange={(value) => {
                    setSelectedSubjectId(value);
                    setSelectedLevelId('all');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn môn học..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Cấp độ</label>
                <Select 
                  value={selectedLevelId} 
                  onValueChange={setSelectedLevelId}
                  disabled={!selectedSubjectId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tất cả cấp độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả cấp độ</SelectItem>
                    {filteredLevels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Thời gian</label>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Tất cả thời gian
                      </div>
                    </SelectItem>
                    <SelectItem value="week">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        7 ngày gần nhất
                      </div>
                    </SelectItem>
                    <SelectItem value="month">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        30 ngày gần nhất
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current User Stats Card */}
        {hasSelectedFilter && currentUserStats && (
          <Card className="mb-6 border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-md overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {renderRankBadge(currentUserRank || 0)}
                    {currentUserRank && currentUserRank <= 10 && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 flex items-center justify-center">
                        <Star className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thứ hạng của bạn</p>
                    <p className="text-lg font-semibold text-foreground">
                      {currentUserStats.display_name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {currentUserStats.ranking_score.toFixed(0)} điểm
                      </Badge>
                      <span className="text-muted-foreground">
                        {currentUserStats.correct_count}/{currentUserStats.total_attempts} đúng
                      </span>
                      <Badge variant="outline" className="text-success border-success/30">
                        {currentUserStats.accuracy_percent.toFixed(1)}%
                      </Badge>
                    </div>
                    {/* Achievement Badges */}
                    <div className="mt-2">
                      <AchievementBadges 
                        achievements={calculateAchievements({
                          ...currentUserStats,
                          rank: currentUserRank || undefined
                        })} 
                        size="sm"
                        maxDisplay={5}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 sm:items-end">
                  {motivationalMessage && (
                    <div className="flex items-center gap-2 text-sm">
                      <motivationalMessage.icon className={`h-4 w-4 ${motivationalMessage.color}`} />
                      <span className="text-muted-foreground">{motivationalMessage.text}</span>
                    </div>
                  )}
                  <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary/80">
                    <Link to="/subjects">
                      <Zap className="mr-2 h-4 w-4" />
                      Luyện thêm ngay
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Progress bar */}
              {currentUserRank && currentUserRank > 10 && distanceToTop10 && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Tiến độ đến Top 10</span>
                    <span>Còn {distanceToTop10} điểm</span>
                  </div>
                  <Progress value={Math.min(90, 100 - (distanceToTop10 / 10))} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Motivation for users not on leaderboard */}
        {hasSelectedFilter && !currentUserStats && user && !isLoading && leaderboardData.length > 0 && (
          <Card className="mb-6 border-0 bg-gradient-to-r from-orange-500/10 to-amber-500/5 shadow-md">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
              <div className="rounded-full bg-gradient-to-br from-orange-400 to-amber-500 p-4 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Bạn chưa có trong bảng xếp hạng này
                </p>
                <p className="text-sm text-muted-foreground">
                  Hãy làm bài thi ngay để xuất hiện và cạnh tranh với mọi người nhé! 💪
                </p>
              </div>
              <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                <Link to="/subjects">
                  Bắt đầu luyện đề
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Tabs */}
        {hasSelectedFilter && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1 p-1 bg-muted/50">
              <TabsTrigger 
                value="overall" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground py-3"
              >
                <Trophy className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Tổng hợp</span>
                <span className="sm:hidden">Tổng</span>
              </TabsTrigger>
              <TabsTrigger 
                value="accuracy"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white py-3"
              >
                <Target className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Chính xác</span>
                <span className="sm:hidden">Xác</span>
              </TabsTrigger>
              <TabsTrigger 
                value="diligent"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white py-3"
              >
                <Flame className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Chăm chỉ</span>
                <span className="sm:hidden">Chăm</span>
              </TabsTrigger>
              <TabsTrigger 
                value="progress"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white py-3"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Tiến bộ</span>
                <span className="sm:hidden">Tiến</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab description */}
            <div className="mt-4 mb-6 p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                {getTabDescription(activeTab)}
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-muted-foreground">Đang tải bảng xếp hạng...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && leaderboardData.length === 0 && (
              <Card className="border-0 shadow-md">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Chưa có dữ liệu xếp hạng
                  </h3>
                  <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                    {activeTab === 'accuracy' 
                      ? 'Chưa có ai làm đủ 50 câu trong khoảng thời gian này. Hãy là người đầu tiên!'
                      : 'Chưa có ai làm bài thi trong khoảng thời gian này. Hãy là người đầu tiên!'}
                  </p>
                  <Button asChild className="bg-gradient-to-r from-primary to-primary/80">
                    <Link to="/subjects">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Bắt đầu luyện đề ngay
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard Content */}
            {!isLoading && leaderboardData.length > 0 && (
              <div className="space-y-6">
                {groupedByLevel.map((group) => (
                  <Card key={group.level_id} className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                      <CardTitle className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span className="text-lg">{group.level_name}</span>
                          <p className="text-sm font-normal text-muted-foreground mt-0.5">
                            {group.users.length} người tham gia
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      {/* Top 3 Podium */}
                      {group.users.length >= 3 && (
                        <div className="grid gap-4 p-6 sm:grid-cols-3 bg-gradient-to-b from-muted/50 to-transparent">
                          {/* Second Place */}
                          <div className="order-1 sm:order-1">
                            <TopUserCard 
                              user={group.users[1]} 
                              rank={2} 
                              isCurrentUser={user?.id === group.users[1].user_id}
                              activeTab={activeTab}
                            />
                          </div>
                          {/* First Place */}
                          <div className="order-0 sm:order-2 sm:-mt-4">
                            <TopUserCard 
                              user={group.users[0]} 
                              rank={1} 
                              isCurrentUser={user?.id === group.users[0].user_id}
                              activeTab={activeTab}
                            />
                          </div>
                          {/* Third Place */}
                          <div className="order-2 sm:order-3">
                            <TopUserCard 
                              user={group.users[2]} 
                              rank={3} 
                              isCurrentUser={user?.id === group.users[2].user_id}
                              activeTab={activeTab}
                            />
                          </div>
                        </div>
                      )}

                      {/* Table for remaining users */}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[70px] text-center">Hạng</TableHead>
                            <TableHead>Người dùng</TableHead>
                            <TableHead className="w-[100px] text-center">
                              {activeTab === 'overall' ? 'Điểm XH' : 
                               activeTab === 'accuracy' ? 'Tỷ lệ đúng' :
                               activeTab === 'diligent' ? 'Tổng câu' : 'Tiến bộ'}
                            </TableHead>
                            <TableHead className="w-[100px] text-center hidden sm:table-cell">Tổng câu</TableHead>
                            <TableHead className="w-[100px] text-center hidden md:table-cell">Tỷ lệ đúng</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.users.slice(group.users.length >= 3 ? 3 : 0).map((item, index) => {
                            const rank = group.users.length >= 3 ? index + 4 : index + 1;
                            const isCurrentUser = user?.id === item.user_id;

                            return (
                              <TableRow
                                key={item.user_id}
                                className={isCurrentUser ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
                              >
                                <TableCell className="text-center">
                                  <div className="flex justify-center">
                                    {renderRankBadge(rank)}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={item.avatar_url || undefined} />
                                      <AvatarFallback className="bg-primary/10 text-primary">
                                        <User className="h-5 w-5" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-foreground">
                                          {item.display_name}
                                        </p>
                                        {isCurrentUser && (
                                          <Badge variant="outline" className="text-xs">Bạn</Badge>
                                        )}
                                        <AchievementBadges 
                                          achievements={getTopAchievements({
                                            ...item,
                                            rank
                                          }, 3)} 
                                          size="sm"
                                          maxDisplay={3}
                                        />
                                      </div>
                                      {item.streak_days > 0 && activeTab === 'diligent' && (
                                        <p className="text-xs text-orange-500 flex items-center gap-1">
                                          <Flame className="h-3 w-3" />
                                          {item.streak_days} ngày hoạt động
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground sm:hidden">
                                        {item.total_attempts} câu • {item.accuracy_percent.toFixed(1)}%
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="text-center">
                                  {activeTab === 'overall' && (
                                    <span className="font-semibold text-primary">
                                      {item.ranking_score.toFixed(0)}
                                    </span>
                                  )}
                                  {activeTab === 'accuracy' && (
                                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                      {item.accuracy_percent.toFixed(1)}%
                                    </Badge>
                                  )}
                                  {activeTab === 'diligent' && (
                                    <span className="font-semibold text-orange-500">
                                      {item.total_attempts}
                                    </span>
                                  )}
                                  {activeTab === 'progress' && (
                                    <Badge className={`${
                                      item.improvement_percent > 0 
                                        ? 'bg-green-500/10 text-green-600' 
                                        : item.improvement_percent < 0
                                        ? 'bg-red-500/10 text-red-600'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {item.improvement_percent > 0 ? '+' : ''}{item.improvement_percent.toFixed(1)}%
                                    </Badge>
                                  )}
                                </TableCell>

                                <TableCell className="text-center hidden sm:table-cell">
                                  <span className="text-muted-foreground">{item.total_attempts}</span>
                                </TableCell>

                                <TableCell className="text-center hidden md:table-cell">
                                  <Badge
                                    variant="secondary"
                                    className={`${
                                      item.accuracy_percent >= 80
                                        ? 'bg-success/10 text-success'
                                        : item.accuracy_percent >= 60
                                        ? 'bg-warning/10 text-warning'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {item.accuracy_percent.toFixed(1)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Tabs>
        )}

        {/* Prompt to select filter */}
        {!hasSelectedFilter && (
          <Card className="border-dashed border-2 shadow-none">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                Chọn môn học để xem xếp hạng
              </h3>
              <p className="mx-auto max-w-md text-muted-foreground">
                Vui lòng chọn môn học bạn muốn xem xếp hạng ở bộ lọc phía trên. 
                Bạn có thể lọc theo cấp độ và thời gian để xem chi tiết hơn.
              </p>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        {hasSelectedFilter && !isLoading && (
          <Card className="mt-8 border-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 shadow-md">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Sẵn sàng cải thiện thứ hạng?
                  </h3>
                  <p className="text-muted-foreground">
                    Mỗi bài luyện tập đều giúp bạn tiến gần hơn đến mục tiêu!
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80">
                <Link to="/subjects">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Bắt đầu luyện đề ngay
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        {!isLoading && hasSelectedFilter && leaderboardData.length > 0 && (
          <div className="mt-8 text-center">
            <Card className="inline-block border-0 bg-muted/50">
              <CardContent className="py-4 px-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Công thức tính điểm:</strong>{' '}
                  Điểm = Tỷ lệ đúng (%) × √(Tổng số câu đã làm)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Công thức này đảm bảo cân bằng giữa độ chính xác và sự chăm chỉ
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// Top 3 User Card Component
interface TopUserCardProps {
  user: UserStats;
  rank: number;
  isCurrentUser: boolean;
  activeTab: LeaderboardType;
}

const TopUserCard = ({ user, rank, isCurrentUser, activeTab }: TopUserCardProps) => {
  const bgColors = {
    1: 'from-yellow-100 to-amber-100 dark:from-yellow-950/50 dark:to-amber-950/40 border-yellow-300 dark:border-yellow-700',
    2: 'from-slate-100 to-gray-100 dark:from-slate-900/50 dark:to-gray-900/40 border-slate-300 dark:border-slate-700',
    3: 'from-amber-100 to-orange-100 dark:from-amber-950/50 dark:to-orange-950/40 border-amber-400 dark:border-amber-800',
  };

  const icons = {
    1: <Crown className="h-5 w-5 text-yellow-500" />,
    2: <Medal className="h-5 w-5 text-slate-500" />,
    3: <Award className="h-5 w-5 text-amber-600" />,
  };

  return (
    <div 
      className={`relative rounded-2xl border-2 bg-gradient-to-br p-5 text-center transition-all hover:shadow-lg ${
        bgColors[rank as keyof typeof bgColors]
      } ${isCurrentUser ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {/* Rank Icon */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-background shadow-lg border-2 ${
          rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-slate-400' : 'border-amber-500'
        }`}>
          {icons[rank as keyof typeof icons]}
        </div>
      </div>

      {/* Avatar */}
      <div className="mt-4 flex justify-center">
        <Avatar className={`${rank === 1 ? 'h-16 w-16' : 'h-14 w-14'} ring-4 ring-white dark:ring-background shadow-lg`}>
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            <User className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* User Info */}
      <p className="mt-3 font-semibold text-foreground truncate">
        {user.display_name}
        {isCurrentUser && (
          <Badge variant="outline" className="ml-1 text-xs">Bạn</Badge>
        )}
      </p>

      {/* Achievement Badges */}
      <div className="mt-2 flex justify-center">
        <AchievementBadges 
          achievements={getTopAchievements({
            ...user,
            rank
          }, 3)} 
          size="sm"
          maxDisplay={3}
        />
      </div>

      {/* Stats based on tab */}
      <div className="mt-2 space-y-1">
        {activeTab === 'overall' && (
          <p className="text-2xl font-bold text-primary">{user.ranking_score.toFixed(0)}</p>
        )}
        {activeTab === 'accuracy' && (
          <p className="text-2xl font-bold text-green-600">{user.accuracy_percent.toFixed(1)}%</p>
        )}
        {activeTab === 'diligent' && (
          <p className="text-2xl font-bold text-orange-500">{user.total_attempts}</p>
        )}
        {activeTab === 'progress' && (
          <p className={`text-2xl font-bold ${user.improvement_percent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {user.improvement_percent > 0 ? '+' : ''}{user.improvement_percent.toFixed(1)}%
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {user.total_attempts} câu • {user.accuracy_percent.toFixed(1)}% đúng
        </p>
        {user.streak_days > 0 && activeTab === 'diligent' && (
          <div className="flex items-center justify-center gap-1 text-sm text-orange-500">
            <Flame className="h-4 w-4" />
            {user.streak_days} ngày hoạt động
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
