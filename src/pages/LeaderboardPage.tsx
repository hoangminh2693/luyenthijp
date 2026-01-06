/**
 * LeaderboardPage - Bảng xếp hạng người dùng
 * Hiển thị xếp hạng theo % đúng của từng user theo section/level
 * Sử dụng Table component cho từng cấp độ
 */
import { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Award, User, Filter, ChevronDown, ChevronRight } from 'lucide-react';
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
  accuracy: number;
}

interface LevelLeaderboard {
  level: Level;
  users: UserStats[];
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
        // Build query for question_history with filters
        let query = supabase
          .from('question_history')
          .select(`
            user_id,
            is_correct,
            question_id,
            questions!inner (
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

        // Apply subject filter
        if (selectedSubjectId !== 'all') {
          query = query.eq('questions.sections.levels.subject_id', selectedSubjectId);
        }

        const { data: historyData, error: historyError } = await query;

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

        // Fetch profiles for these users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        }

        // Create a map of user_id -> profile
        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        // Group by level, then by user
        const levelUserMap = new Map<string, Map<string, { total: number; correct: number }>>();
        const levelInfoMap = new Map<string, Level>();

        (historyData || []).forEach(h => {
          if (!h.user_id) return;
          
          const section = (h.questions as any)?.sections;
          const level = section?.levels;
          
          if (!level) return;

          // Store level info
          if (!levelInfoMap.has(level.id)) {
            levelInfoMap.set(level.id, level);
          }

          // Initialize level in map
          if (!levelUserMap.has(level.id)) {
            levelUserMap.set(level.id, new Map());
          }

          const userMap = levelUserMap.get(level.id)!;
          const existing = userMap.get(h.user_id) || { total: 0, correct: 0 };
          existing.total++;
          if (h.is_correct) existing.correct++;
          userMap.set(h.user_id, existing);
        });

        // Build leaderboards per level
        const leaderboards: LevelLeaderboard[] = [];

        levelUserMap.forEach((userMap, levelId) => {
          const level = levelInfoMap.get(levelId);
          if (!level) return;

          const users: UserStats[] = [];
          userMap.forEach((stats, userId) => {
            const profile = profileMap.get(userId);
            users.push({
              user_id: userId,
              display_name: profile?.display_name || 'Người dùng ẩn danh',
              avatar_url: profile?.avatar_url || null,
              total_attempts: stats.total,
              correct_count: stats.correct,
              accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
            });
          });

          // Sort by accuracy (desc), then by total_attempts (desc)
          users.sort((a, b) => {
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            return b.total_attempts - a.total_attempts;
          });

          leaderboards.push({
            level,
            users: users.slice(0, 20), // Top 20 per level
          });
        });

        // Sort levels by order_index
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
            Xếp hạng theo từng cấp độ dựa trên tỷ lệ % trả lời đúng
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Lọc theo:</span>
            </div>

            {/* Subject filter */}
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
                          {lb.users.length} người tham gia
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
                            <TableHead className="w-[100px] text-center hidden sm:table-cell">Số câu</TableHead>
                            <TableHead className="w-[100px] text-center hidden sm:table-cell">Đúng</TableHead>
                            <TableHead className="w-[120px] text-center">Tỷ lệ</TableHead>
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
                                {/* Rank */}
                                <TableCell className="text-center">
                                  <div className="flex justify-center">
                                    {renderRankBadge(rank)}
                                  </div>
                                </TableCell>

                                {/* User info */}
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
                                      {/* Mobile only: show stats */}
                                      <p className="text-xs text-muted-foreground sm:hidden">
                                        {item.correct_count}/{item.total_attempts} câu đúng
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Total attempts */}
                                <TableCell className="text-center hidden sm:table-cell">
                                  <span className="text-foreground">{item.total_attempts}</span>
                                </TableCell>

                                {/* Correct count */}
                                <TableCell className="text-center hidden sm:table-cell">
                                  <span className="text-success">{item.correct_count}</span>
                                </TableCell>

                                {/* Accuracy */}
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
            Chỉ hiển thị người dùng đã đăng nhập. Làm bài nhiều hơn để nâng hạng!
          </p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
