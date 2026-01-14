/**
 * LeaderboardPage - Bảng xếp hạng người dùng
 * Hiển thị xếp hạng theo % đúng của từng user theo section/level
 * % = số câu đúng distinct / tổng số câu trong database
 */
import { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Award, User, Filter, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Breadcrumb } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
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
  accuracy: number; // % = correct_count / total_questions_in_db
}

interface LevelLeaderboard {
  level: Level;
  users: UserStats[];
  total_questions: number;
}

const LeaderboardPage = () => {
  const { user } = useAuth();
  
  // Filter states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  
  // Leaderboard data by level
  const [levelLeaderboards, setLevelLeaderboards] = useState<LevelLeaderboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

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
    if (selectedSubjectId === 'all') return levels;
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

  // Expand all levels by default when data loads
  useEffect(() => {
    if (filteredLevels.length > 0) {
      setExpandedLevels(new Set(filteredLevels.map(l => l.id)));
    }
  }, [filteredLevels]);

  // Load leaderboard data grouped by level
  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);

      try {
        // 1. Lấy tổng số câu hỏi theo từng level (chỉ đếm câu cha - parent_id IS NULL)
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
          .is('parent_id', null);

        if (selectedSubjectId !== 'all') {
          questionsQuery = questionsQuery.eq('sections.levels.subject_id', selectedSubjectId);
        }

        const { data: questionsData, error: questionsError } = await questionsQuery;

        if (questionsError) {
          console.error('Error loading questions:', questionsError);
          setLevelLeaderboards([]);
          setIsLoading(false);
          return;
        }

        // Đếm số câu hỏi theo level
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

        // 2. Lấy history - đếm số câu distinct đã trả lời đúng
        let historyQuery = supabase
          .from('question_history')
          .select(`
            user_id,
            is_correct,
            question_id,
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
          .not('user_id', 'is', null);

        if (selectedSubjectId !== 'all') {
          historyQuery = historyQuery.eq('questions.sections.levels.subject_id', selectedSubjectId);
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

        // Group by level, then by user - đếm số câu DISTINCT đã trả lời đúng
        const levelUserMap = new Map<string, Map<string, { correctQuestionIds: Set<string>; totalAttempts: number }>>();

        (historyData || []).forEach(h => {
          if (!h.user_id) return;
          
          const question = h.questions as any;
          const section = question?.sections;
          const level = section?.levels;
          
          if (!level) return;

          // Xác định question_id thực sự (nếu là câu con thì lấy parent_id)
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

        levelUserMap.forEach((userMap, levelId) => {
          const level = levelInfoMap.get(levelId);
          if (!level) return;

          const totalQuestionsInLevel = levelQuestionCount.get(levelId) || 0;

          const users: UserStats[] = [];
          userMap.forEach((stats, userId) => {
            const profile = profileMap.get(userId);
            const correctCount = stats.correctQuestionIds.size;
            
            users.push({
              user_id: userId,
              display_name: profile?.display_name || 'Người dùng ẩn danh',
              avatar_url: profile?.avatar_url || null,
              total_attempts: stats.totalAttempts,
              correct_count: correctCount,
              total_questions_in_db: totalQuestionsInLevel,
              accuracy: totalQuestionsInLevel > 0 ? (correctCount / totalQuestionsInLevel) * 100 : 0,
            });
          });

          // Sort by accuracy (desc), then correct_count (desc), then total_attempts (asc)
          users.sort((a, b) => {
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
            return a.total_attempts - b.total_attempts;
          });

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
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setLevelLeaderboards([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [selectedSubjectId]);

  // Render rank badge
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md">
          <Trophy className="h-4 w-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md">
          <Medal className="h-4 w-4" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md">
          <Award className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
        {rank}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', href: '/' },
              { label: 'Bảng xếp hạng' },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Bảng xếp hạng</h1>
          <p className="text-muted-foreground">
            Xếp hạng theo % câu đúng / tổng số câu trong kho đề
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Lọc theo:</span>
            </div>

            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tất cả môn học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả môn học</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leaderboards by Level */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Đang tải...</div>
          </div>
        ) : levelLeaderboards.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-foreground">Chưa có dữ liệu</p>
            <p className="text-sm text-muted-foreground">
              Hãy làm bài thi để xuất hiện trên bảng xếp hạng
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {levelLeaderboards.map((lb) => (
              <Collapsible
                key={lb.level.id}
                open={expandedLevels.has(lb.level.id)}
                onOpenChange={() => toggleLevel(lb.level.id)}
              >
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">{lb.level.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {lb.users.length} người tham gia • {lb.total_questions} câu hỏi
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[80px] text-center">Hạng</TableHead>
                            <TableHead>Người dùng</TableHead>
                            <TableHead className="w-[120px] text-center hidden sm:table-cell">Tiến độ</TableHead>
                            <TableHead className="w-[100px] text-center hidden sm:table-cell">Số lần làm</TableHead>
                            <TableHead className="w-[120px] text-center">Hoàn thành</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lb.users.map((item, index) => {
                            const rank = index + 1;
                            const isCurrentUser = user?.id === item.user_id;

                            return (
                              <TableRow
                                key={item.user_id}
                                className={`${
                                  isCurrentUser
                                    ? 'bg-primary/5 border-l-4 border-l-primary'
                                    : ''
                                } ${rank <= 3 ? 'bg-muted/10' : ''}`}
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
                                        className="h-8 w-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <User className="h-4 w-4" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium text-foreground text-sm">
                                        {item.display_name}
                                        {isCurrentUser && (
                                          <Badge variant="outline" className="ml-2 text-xs">
                                            Bạn
                                          </Badge>
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground sm:hidden">
                                        {item.correct_count}/{item.total_questions_in_db} câu đúng
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="text-center hidden sm:table-cell">
                                  <span className="text-foreground font-medium">
                                    {item.correct_count}/{item.total_questions_in_db}
                                  </span>
                                </TableCell>

                                <TableCell className="text-center hidden sm:table-cell">
                                  <span className="text-muted-foreground">{item.total_attempts}</span>
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
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Info text */}
        {!isLoading && levelLeaderboards.length > 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Xếp hạng dựa trên % câu hỏi đã trả lời đúng / tổng số câu hỏi trong kho đề. Chỉ hiển thị người dùng đã đăng nhập.
          </p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
