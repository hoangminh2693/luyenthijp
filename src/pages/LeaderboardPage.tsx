/**
 * LeaderboardPage - Bảng xếp hạng người dùng
 * Hiển thị xếp hạng theo % đúng của từng user theo môn/cấp độ
 * Tạo động lực cho người dùng luyện tập mỗi ngày
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Medal, Award, User, Filter, ChevronDown, ChevronRight, 
  BookOpen, Target, TrendingUp, Flame, Star, ArrowRight, Calendar,
  Zap, Clock
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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

interface Section {
  id: string;
  name: string;
  slug: string;
  level_id: string;
}

interface UserStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_attempts: number;
  correct_count: number;
  total_questions_in_db: number;
  accuracy: number;
  total_score: number;
}

interface LevelLeaderboard {
  level: Level;
  users: UserStats[];
  total_questions: number;
}

type TimeRange = 'week' | 'month' | 'all';

const LeaderboardPage = () => {
  const { user } = useAuth();
  
  // Filter states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  
  // Leaderboard data
  const [levelLeaderboards, setLevelLeaderboards] = useState<LevelLeaderboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [hasSelectedFilter, setHasSelectedFilter] = useState(false);

  // Current user stats
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserStats, setCurrentUserStats] = useState<UserStats | null>(null);
  const [distanceToTop10, setDistanceToTop10] = useState<number | null>(null);

  // Load filter data
  useEffect(() => {
    const loadFilterData = async () => {
      const [subjectsRes, levelsRes, sectionsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('levels').select('*').order('order_index'),
        supabase.from('sections').select('*').order('order_index'),
      ]);

      setSubjects(subjectsRes.data || []);
      setLevels(levelsRes.data || []);
      setSections(sectionsRes.data || []);
    };

    loadFilterData();
  }, []);

  // Filter levels based on subject
  const filteredLevels = useMemo(() => {
    if (!selectedSubjectId) return [];
    return levels.filter(l => l.subject_id === selectedSubjectId);
  }, [levels, selectedSubjectId]);

  // Get selected subject
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Toggle level expansion
  const toggleLevel = (levelId: string) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(levelId)) {
        newSet.delete(levelId);
      } else {
        newSet.add(levelId);
      }
      return newSet;
    });
  };

  // Get time range filter date
  const getTimeRangeDate = (range: TimeRange): Date | null => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'all':
        return null;
    }
  };

  // Expand all levels by default when data loads
  useEffect(() => {
    if (levelLeaderboards.length > 0) {
      setExpandedLevels(new Set(levelLeaderboards.map(l => l.level.id)));
    }
  }, [levelLeaderboards]);

  // Load leaderboard data grouped by level
  useEffect(() => {
    if (!selectedSubjectId) {
      setLevelLeaderboards([]);
      setHasSelectedFilter(false);
      return;
    }

    setHasSelectedFilter(true);

    const loadLeaderboard = async () => {
      setIsLoading(true);

      try {
        const timeFilterDate = getTimeRangeDate(timeRange);

        // 1. Get total questions per level
        let questionsQuery = supabase
          .from('questions')
          .select(`
            id,
            section_id,
            sections!inner (
              id,
              level_id,
              levels!inner (
                id,
                name,
                subject_id,
                order_index
              )
            )
          `)
          .is('parent_id', null)
          .eq('sections.levels.subject_id', selectedSubjectId);

        if (selectedLevelId !== 'all') {
          questionsQuery = questionsQuery.eq('sections.level_id', selectedLevelId);
        }

        const { data: questionsData, error: questionsError } = await questionsQuery;

        if (questionsError) {
          console.error('Error loading questions:', questionsError);
          setLevelLeaderboards([]);
          setIsLoading(false);
          return;
        }

        // Count questions per level
        const levelQuestionCount = new Map<string, number>();
        const levelInfoMap = new Map<string, Level>();

        (questionsData || []).forEach(q => {
          const level = (q.sections as any)?.levels;
          if (!level) return;

          if (!levelInfoMap.has(level.id)) {
            levelInfoMap.set(level.id, level);
          }

          levelQuestionCount.set(level.id, (levelQuestionCount.get(level.id) || 0) + 1);
        });

        // 2. Get history with time filter
        let historyQuery = supabase
          .from('question_history')
          .select(`
            user_id,
            is_correct,
            question_id,
            answered_at,
            questions!inner (
              id,
              parent_id,
              section_id,
              sections!inner (
                id,
                level_id,
                levels!inner (
                  id,
                  name,
                  subject_id,
                  order_index
                )
              )
            )
          `)
          .not('user_id', 'is', null)
          .eq('questions.sections.levels.subject_id', selectedSubjectId);

        if (selectedLevelId !== 'all') {
          historyQuery = historyQuery.eq('questions.sections.level_id', selectedLevelId);
        }

        if (timeFilterDate) {
          historyQuery = historyQuery.gte('answered_at', timeFilterDate.toISOString());
        }

        const { data: historyData, error: historyError } = await historyQuery;

        if (historyError) {
          console.error('Error loading history:', historyError);
          setLevelLeaderboards([]);
          setIsLoading(false);
          return;
        }

        // Get unique user IDs
        const userIds = [...new Set((historyData || []).map(h => h.user_id).filter(Boolean))] as string[];

        if (userIds.length === 0) {
          setLevelLeaderboards([]);
          setCurrentUserRank(null);
          setCurrentUserStats(null);
          setDistanceToTop10(null);
          setIsLoading(false);
          return;
        }

        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        }

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        // Group by level, then by user
        const levelUserMap = new Map<string, Map<string, { correctQuestionIds: Set<string>; totalAttempts: number }>>();

        (historyData || []).forEach(h => {
          if (!h.user_id) return;
          
          const question = h.questions as any;
          const section = question?.sections;
          const level = section?.levels;
          
          if (!level) return;

          const effectiveQuestionId = question.parent_id || question.id;

          if (!levelUserMap.has(level.id)) {
            levelUserMap.set(level.id, new Map());
          }

          const userMap = levelUserMap.get(level.id)!;
          const existing = userMap.get(h.user_id) || { correctQuestionIds: new Set<string>(), totalAttempts: 0 };
          existing.totalAttempts++;
          
          if (h.is_correct) {
            existing.correctQuestionIds.add(effectiveQuestionId);
          }
          
          userMap.set(h.user_id, existing);
        });

        // Build leaderboards per level
        const leaderboards: LevelLeaderboard[] = [];
        let foundCurrentUser = false;
        let currentUserOverallRank: number | null = null;
        let currentUserOverallStats: UserStats | null = null;

        levelUserMap.forEach((userMap, levelId) => {
          const level = levelInfoMap.get(levelId);
          if (!level) return;

          const totalQuestionsInLevel = levelQuestionCount.get(levelId) || 0;

          const users: UserStats[] = [];
          userMap.forEach((stats, userId) => {
            const profile = profileMap.get(userId);
            const correctCount = stats.correctQuestionIds.size;
            const accuracy = totalQuestionsInLevel > 0 ? (correctCount / totalQuestionsInLevel) * 100 : 0;
            const totalScore = correctCount * 10 + Math.floor(accuracy);
            
            users.push({
              user_id: userId,
              display_name: profile?.display_name || 'Người dùng ẩn danh',
              avatar_url: profile?.avatar_url || null,
              total_attempts: stats.totalAttempts,
              correct_count: correctCount,
              total_questions_in_db: totalQuestionsInLevel,
              accuracy,
              total_score: totalScore,
            });
          });

          // Sort by score (desc), then accuracy (desc), then attempts (asc)
          users.sort((a, b) => {
            if (b.total_score !== a.total_score) return b.total_score - a.total_score;
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            return a.total_attempts - b.total_attempts;
          });

          // Find current user rank
          if (user && !foundCurrentUser) {
            const userIndex = users.findIndex(u => u.user_id === user.id);
            if (userIndex !== -1) {
              foundCurrentUser = true;
              currentUserOverallRank = userIndex + 1;
              currentUserOverallStats = users[userIndex];
              
              // Calculate distance to top 10
              if (userIndex >= 10 && users.length > 10) {
                const top10LastScore = users[9].total_score;
                setDistanceToTop10(top10LastScore - users[userIndex].total_score);
              } else {
                setDistanceToTop10(null);
              }
            }
          }

          leaderboards.push({
            level,
            users: users.slice(0, 20),
            total_questions: totalQuestionsInLevel,
          });
        });

        leaderboards.sort((a, b) => {
          const orderA = a.level.order_index ?? 0;
          const orderB = b.level.order_index ?? 0;
          return orderA - orderB;
        });

        setLevelLeaderboards(leaderboards);
        setCurrentUserRank(currentUserOverallRank);
        setCurrentUserStats(currentUserOverallStats);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setLevelLeaderboards([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [selectedSubjectId, selectedLevelId, timeRange, user]);

  // Render rank badge - using semantic design tokens
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-lg">
          <Trophy className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-lg">
          <Medal className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg">
          <Award className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
        {rank}
      </div>
    );
  };

  // Get time range label
  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case 'week': return 'Tuần này';
      case 'month': return 'Tháng này';
      case 'all': return 'Tất cả thời gian';
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-warning/20 p-4">
            <Trophy className="h-10 w-10 text-warning" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            Bảng xếp hạng
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Cạnh tranh lành mạnh, tiến bộ mỗi ngày. Hãy luyện tập đều đặn để chinh phục vị trí cao nhất!
          </p>
        </div>

        {/* Motivation Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/20 p-2">
                <Flame className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Luyện tập mỗi ngày</p>
                <p className="font-semibold text-foreground">Tiến bộ vượt trội</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-warning/20 p-2">
                <Star className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chinh phục Top 10</p>
                <p className="font-semibold text-foreground">Nhận vinh danh</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-success/20 bg-gradient-to-br from-success/5 to-success/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-success/20 p-2">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Theo dõi tiến độ</p>
                <p className="font-semibold text-foreground">Cải thiện liên tục</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-accent/30 p-2">
                <Target className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mục tiêu rõ ràng</p>
                <p className="font-semibold text-foreground">Đạt điểm cao</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              Chọn bộ lọc để xem xếp hạng
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
                <label className="text-sm font-medium text-foreground">Cấp độ / Phần</label>
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
                    <SelectItem value="week">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Tuần này
                      </div>
                    </SelectItem>
                    <SelectItem value="month">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Tháng này
                      </div>
                    </SelectItem>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Tất cả thời gian
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prompt to select filter */}
        {!hasSelectedFilter && (
          <Card className="border-dashed">
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

        {/* Current User Stats Card */}
        {hasSelectedFilter && currentUserStats && (
          <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                    #{currentUserRank}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thứ hạng của bạn</p>
                    <p className="text-lg font-semibold text-foreground">
                      {currentUserStats.display_name}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {currentUserStats.correct_count}/{currentUserStats.total_questions_in_db} câu đúng
                      </span>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {currentUserStats.accuracy.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 sm:items-end">
                  {distanceToTop10 !== null && distanceToTop10 > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Còn <span className="font-semibold text-primary">{distanceToTop10} điểm</span> để vào Top 10
                    </p>
                  )}
                  {currentUserRank && currentUserRank <= 10 && (
                    <Badge className="bg-warning text-warning-foreground">
                      <Star className="mr-1 h-3 w-3" />
                      Top 10
                    </Badge>
                  )}
                  <Button asChild size="sm">
                    <Link to="/subjects">
                      <Zap className="mr-2 h-4 w-4" />
                      Luyện thêm ngay
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Progress to next milestone */}
              {currentUserRank && currentUserRank > 10 && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Tiến độ đến Top 10</span>
                    <span>{Math.max(0, 100 - (distanceToTop10 || 0))}%</span>
                  </div>
                  <Progress value={Math.max(0, 100 - (distanceToTop10 || 0))} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Motivation Message */}
        {hasSelectedFilter && !currentUserStats && user && !isLoading && levelLeaderboards.length > 0 && (
          <Card className="mb-6 border-warning/30 bg-gradient-to-r from-warning/5 to-transparent">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
              <div className="rounded-full bg-warning/20 p-3">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Bạn chưa có trong bảng xếp hạng này
                </p>
                <p className="text-sm text-muted-foreground">
                  Hãy làm bài thi ngay để xuất hiện và cạnh tranh với mọi người!
                </p>
              </div>
              <Button asChild>
                <Link to="/subjects">
                  Bắt đầu luyện đề
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Leaderboards by Level */}
        {hasSelectedFilter && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-muted-foreground">Đang tải bảng xếp hạng...</p>
                </div>
              </div>
            ) : levelLeaderboards.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Chưa có dữ liệu xếp hạng
                  </h3>
                  <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                    Chưa có ai làm bài thi trong {getTimeRangeLabel(timeRange).toLowerCase()} cho môn học này. 
                    Hãy là người đầu tiên!
                  </p>
                  <Button asChild>
                    <Link to="/subjects">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Bắt đầu luyện đề ngay
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {levelLeaderboards.map((lb) => (
                  <Collapsible
                    key={lb.level.id}
                    open={expandedLevels.has(lb.level.id)}
                    onOpenChange={() => toggleLevel(lb.level.id)}
                  >
                    <Card>
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                            <Trophy className="h-6 w-6 text-primary" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-foreground">{lb.level.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {lb.users.length} người tham gia • {lb.total_questions} câu hỏi
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="hidden sm:inline-flex">
                            Top {Math.min(lb.users.length, 20)}
                          </Badge>
                          {expandedLevels.has(lb.level.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-border">
                          {/* Top 3 Highlight */}
                          {lb.users.length >= 3 && (
                            <div className="grid gap-3 p-4 sm:grid-cols-3 bg-gradient-to-b from-muted/30 to-transparent">
                              {lb.users.slice(0, 3).map((item, index) => {
                                const rank = index + 1;
                                const isCurrentUser = user?.id === item.user_id;
                                const bgColors = [
                                  'from-warning/20 to-warning/5 border-warning/30',
                                  'from-muted/40 to-muted/20 border-muted-foreground/30',
                                  'from-warning/15 to-warning/5 border-warning/25',
                                ];
                                
                                return (
                                  <div 
                                    key={item.user_id}
                                    className={`relative rounded-xl border bg-gradient-to-br p-4 ${bgColors[index]} ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}
                                  >
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                      {renderRankBadge(rank)}
                                    </div>
                                    <div className="mt-4 text-center">
                                      {item.avatar_url ? (
                                        <img
                                          src={item.avatar_url}
                                          alt={item.display_name}
                                          className="mx-auto h-12 w-12 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                          <User className="h-6 w-6" />
                                        </div>
                                      )}
                                      <p className="mt-2 font-semibold text-foreground truncate">
                                        {item.display_name}
                                        {isCurrentUser && (
                                          <Badge variant="outline" className="ml-1 text-xs">Bạn</Badge>
                                        )}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {item.total_score} điểm
                                      </p>
                                      <Badge variant="secondary" className="mt-2">
                                        {item.accuracy.toFixed(1)}%
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Table for remaining users */}
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="w-[80px] text-center">Hạng</TableHead>
                                <TableHead>Người dùng</TableHead>
                                <TableHead className="w-[100px] text-center hidden sm:table-cell">Điểm</TableHead>
                                <TableHead className="w-[100px] text-center hidden sm:table-cell">Số đề</TableHead>
                                <TableHead className="w-[120px] text-center">Tỷ lệ đúng</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lb.users.slice(lb.users.length >= 3 ? 3 : 0).map((item, index) => {
                                const rank = lb.users.length >= 3 ? index + 4 : index + 1;
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
                                        {item.avatar_url ? (
                                          <img
                                            src={item.avatar_url}
                                            alt={item.display_name}
                                            className="h-10 w-10 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <User className="h-5 w-5" />
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-medium text-foreground">
                                            {item.display_name}
                                            {isCurrentUser && (
                                              <Badge variant="outline" className="ml-2 text-xs">Bạn</Badge>
                                            )}
                                          </p>
                                          <p className="text-xs text-muted-foreground sm:hidden">
                                            {item.total_score} điểm • {item.correct_count}/{item.total_questions_in_db}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>

                                    <TableCell className="text-center hidden sm:table-cell">
                                      <span className="font-semibold text-foreground">{item.total_score}</span>
                                    </TableCell>

                                    <TableCell className="text-center hidden sm:table-cell">
                                      <span className="text-muted-foreground">
                                        {item.correct_count}/{item.total_questions_in_db}
                                      </span>
                                    </TableCell>

                                    <TableCell className="text-center">
                                      <Badge
                                        variant="secondary"
                                        className={`${
                                          item.accuracy >= 80
                                            ? 'bg-success/10 text-success hover:bg-success/20'
                                            : item.accuracy >= 60
                                            ? 'bg-warning/10 text-warning hover:bg-warning/20'
                                            : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                                        }`}
                                      >
                                        {item.accuracy.toFixed(1)}%
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA Section */}
        {hasSelectedFilter && !isLoading && (
          <Card className="mt-8 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Sẵn sàng cải thiện thứ hạng?
                </h3>
                <p className="text-muted-foreground">
                  Mỗi bài luyện tập đều giúp bạn tiến gần hơn đến mục tiêu!
                </p>
              </div>
              <Button asChild size="lg">
                <Link to="/subjects">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Bắt đầu luyện đề ngay
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        {!isLoading && hasSelectedFilter && levelLeaderboards.length > 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Xếp hạng dựa trên tổng điểm (số câu đúng × 10 + % chính xác). Chỉ hiển thị người dùng đã đăng nhập.
          </p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
