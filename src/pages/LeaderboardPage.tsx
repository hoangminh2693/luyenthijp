/**
 * LeaderboardPage - Bảng xếp hạng người dùng
 * Hiển thị xếp hạng theo % đúng của từng user theo section/level
 */
import { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Award, User, ChevronDown, Filter } from 'lucide-react';
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

const LeaderboardPage = () => {
  const { user } = useAuth();
  
  // Filter states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  
  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Get selected subject
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const subjectHasLevels = selectedSubject?.has_levels ?? true;

  // Filter levels and sections based on selection
  const filteredLevels = useMemo(() => {
    if (selectedSubjectId === 'all') return levels;
    return levels.filter(l => l.subject_id === selectedSubjectId);
  }, [levels, selectedSubjectId]);

  const filteredSections = useMemo(() => {
    if (selectedSubjectId === 'all') return sections;
    if (selectedLevelId !== 'all') {
      return sections.filter(s => s.level_id === selectedLevelId);
    }
    // Filter by subject's levels
    const levelIds = filteredLevels.map(l => l.id);
    return sections.filter(s => levelIds.includes(s.level_id));
  }, [sections, selectedSubjectId, selectedLevelId, filteredLevels]);

  // Reset filters when parent changes
  useEffect(() => {
    setSelectedLevelId('all');
    setSelectedSectionId('all');
  }, [selectedSubjectId]);

  useEffect(() => {
    setSelectedSectionId('all');
  }, [selectedLevelId]);

  // Load leaderboard data
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
                  subject_id
                )
              )
            )
          `)
          .not('user_id', 'is', null);

        // Apply section filter
        if (selectedSectionId !== 'all') {
          query = query.eq('questions.section_id', selectedSectionId);
        } else if (selectedLevelId !== 'all') {
          query = query.eq('questions.sections.level_id', selectedLevelId);
        } else if (selectedSubjectId !== 'all') {
          query = query.eq('questions.sections.levels.subject_id', selectedSubjectId);
        }

        const { data: historyData, error: historyError } = await query;

        if (historyError) {
          console.error('Error loading history:', historyError);
          setLeaderboard([]);
          setIsLoading(false);
          return;
        }

        // Get unique user IDs
        const userIds = [...new Set((historyData || []).map(h => h.user_id).filter(Boolean))] as string[];

        if (userIds.length === 0) {
          setLeaderboard([]);
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

        // Calculate stats per user
        const statsMap = new Map<string, { total: number; correct: number }>();

        (historyData || []).forEach(h => {
          if (!h.user_id) return;
          const existing = statsMap.get(h.user_id) || { total: 0, correct: 0 };
          existing.total++;
          if (h.is_correct) existing.correct++;
          statsMap.set(h.user_id, existing);
        });

        // Build leaderboard
        const leaderboardData: UserStats[] = [];

        statsMap.forEach((stats, userId) => {
          const profile = profileMap.get(userId);
          leaderboardData.push({
            user_id: userId,
            display_name: profile?.display_name || 'Người dùng ẩn danh',
            avatar_url: profile?.avatar_url || null,
            total_attempts: stats.total,
            correct_count: stats.correct,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
          });
        });

        // Sort by accuracy (desc), then by total_attempts (desc)
        leaderboardData.sort((a, b) => {
          if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
          return b.total_attempts - a.total_attempts;
        });

        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [selectedSubjectId, selectedLevelId, selectedSectionId]);

  // Render rank badge
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg">
          <Trophy className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg">
          <Medal className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg">
          <Award className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">
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
            Xếp hạng dựa trên tỷ lệ % trả lời đúng
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
              <SelectTrigger className="w-[180px]">
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

            {/* Level filter */}
            {selectedSubjectId !== 'all' && subjectHasLevels && (
              <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
                <SelectTrigger className="w-[180px]">
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
            )}

            {/* Section filter */}
            {(selectedSubjectId !== 'all' && (!subjectHasLevels || selectedLevelId !== 'all')) && (
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tất cả phần" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phần</SelectItem>
                  {filteredSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-muted-foreground">Đang tải...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium text-foreground">Chưa có dữ liệu</p>
              <p className="text-sm text-muted-foreground">
                Hãy làm bài thi để xuất hiện trên bảng xếp hạng
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-4 bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground">
                <div className="col-span-1 text-center">Hạng</div>
                <div className="col-span-5">Người dùng</div>
                <div className="col-span-2 text-center">Số câu</div>
                <div className="col-span-2 text-center">Đúng</div>
                <div className="col-span-2 text-center">Tỷ lệ</div>
              </div>

              {/* Leaderboard rows */}
              {leaderboard.map((item, index) => {
                const rank = index + 1;
                const isCurrentUser = user?.id === item.user_id;

                return (
                  <div
                    key={item.user_id}
                    className={`grid grid-cols-12 gap-4 px-4 py-4 transition-colors ${
                      isCurrentUser
                        ? 'bg-primary/5 border-l-4 border-l-primary'
                        : 'hover:bg-muted/20'
                    } ${rank <= 3 ? 'bg-muted/10' : ''}`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center justify-center">
                      {renderRankBadge(rank)}
                    </div>

                    {/* User info */}
                    <div className="col-span-5 flex items-center gap-3">
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
                            <span className="ml-2 text-xs text-primary">(Bạn)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Total attempts */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="text-foreground">{item.total_attempts}</span>
                    </div>

                    {/* Correct count */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="text-success">{item.correct_count}</span>
                    </div>

                    {/* Accuracy */}
                    <div className="col-span-2 flex items-center justify-center">
                      <div
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          item.accuracy >= 80
                            ? 'bg-success/10 text-success'
                            : item.accuracy >= 60
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {item.accuracy.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info text */}
        {!isLoading && leaderboard.length > 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Chỉ hiển thị người dùng đã đăng nhập. Làm bài nhiều hơn để nâng hạng!
          </p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
