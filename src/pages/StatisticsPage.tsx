/**
 * StatisticsPage - Trang thống kê tiến trình học tập cá nhân
 * Hiển thị biểu đồ chi tiết theo thời gian
 */
import { useState, useEffect, useMemo } from 'react';
import { useSEO } from '@/hooks/useSEO';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Target, 
  CheckCircle2, 
  XCircle,
  Clock,
  BookOpen
} from 'lucide-react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Subject {
  id: string;
  name: string;
  slug: string;
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

interface DailyStats {
  date: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface SectionStats {
  section_id: string;
  section_name: string;
  total: number;
  correct: number;
  accuracy: number;
}

const chartConfig = {
  total: {
    label: "Tổng số câu",
    color: "hsl(var(--primary))",
  },
  correct: {
    label: "Trả lời đúng",
    color: "hsl(var(--success))",
  },
  wrong: {
    label: "Trả lời sai",
    color: "hsl(var(--destructive))",
  },
  accuracy: {
    label: "Tỷ lệ đúng",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

const StatisticsPage = () => {
  useSEO({ title: 'Thống kê học tập | Luyện Đề Thi', description: 'Thống kê tiến trình học tập cá nhân.', noindex: true });
  const { user } = useAuth();
  
  // Filter states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7');
  
  // Stats data
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [sectionStats, setSectionStats] = useState<SectionStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    total: 0,
    correct: 0,
    accuracy: 0,
  });
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

  // Filter levels based on subject
  const filteredLevels = useMemo(() => {
    if (selectedSubjectId === 'all') return levels;
    return levels.filter(l => l.subject_id === selectedSubjectId);
  }, [levels, selectedSubjectId]);

  // Reset level when subject changes
  useEffect(() => {
    setSelectedLevelId('all');
  }, [selectedSubjectId]);

  // Load statistics data
  useEffect(() => {
    const loadStatistics = async () => {
      setIsLoading(true);

      try {
        const days = parseInt(timeRange);
        const startDate = startOfDay(subDays(new Date(), days - 1));
        const endDate = endOfDay(new Date());

        // Build query - Only for authenticated users (device_id removed for privacy)
        if (!user) {
          // Anonymous users: no database history, use localStorage
          setIsLoading(false);
          return;
        }

        const query = supabase
          .from('question_history')
          .select(`
            is_correct,
            answered_at,
            question_id,
            user_id,
            questions!inner (
              section_id,
              sections!inner (
                id,
                name,
                level_id,
                levels!inner (
                  id,
                  subject_id
                )
              )
            )
          `)
          .eq('user_id', user.id)
          .gte('answered_at', startDate.toISOString())
          .lte('answered_at', endDate.toISOString());

        // Apply filters
        let finalQuery = query;
        if (selectedLevelId !== 'all') {
          finalQuery = query.eq('questions.sections.level_id', selectedLevelId);
        } else if (selectedSubjectId !== 'all') {
          finalQuery = query.eq('questions.sections.levels.subject_id', selectedSubjectId);
        }

        const { data, error } = await finalQuery;

        if (error) {
          console.error('Error loading statistics:', error);
          setIsLoading(false);
          return;
        }

        // Process daily stats
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyMap = new Map<string, { total: number; correct: number }>();
        
        dateRange.forEach(date => {
          dailyMap.set(format(date, 'yyyy-MM-dd'), { total: 0, correct: 0 });
        });

        // Process section stats
        const sectionMap = new Map<string, { name: string; total: number; correct: number }>();

        let totalAttempts = 0;
        let totalCorrect = 0;

        (data || []).forEach(item => {
          const dateKey = format(new Date(item.answered_at), 'yyyy-MM-dd');
          const dailyData = dailyMap.get(dateKey);
          
          if (dailyData) {
            dailyData.total++;
            if (item.is_correct) dailyData.correct++;
            dailyMap.set(dateKey, dailyData);
          }

          // Section stats
          const section = (item.questions as any)?.sections;
          if (section) {
            const sectionData = sectionMap.get(section.id) || {
              name: section.name,
              total: 0,
              correct: 0,
            };
            sectionData.total++;
            if (item.is_correct) sectionData.correct++;
            sectionMap.set(section.id, sectionData);
          }

          totalAttempts++;
          if (item.is_correct) totalCorrect++;
        });

        // Convert to arrays
        const dailyArray: DailyStats[] = [];
        dailyMap.forEach((stats, date) => {
          dailyArray.push({
            date: format(new Date(date), 'dd/MM', { locale: vi }),
            total: stats.total,
            correct: stats.correct,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
          });
        });

        const sectionArray: SectionStats[] = [];
        sectionMap.forEach((stats, sectionId) => {
          sectionArray.push({
            section_id: sectionId,
            section_name: stats.name,
            total: stats.total,
            correct: stats.correct,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
          });
        });

        // Sort sections by total attempts
        sectionArray.sort((a, b) => b.total - a.total);

        setDailyStats(dailyArray);
        setSectionStats(sectionArray.slice(0, 10)); // Top 10 sections
        setTotalStats({
          total: totalAttempts,
          correct: totalCorrect,
          accuracy: totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0,
        });
      } catch (err) {
        console.error('Error loading statistics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatistics();
  }, [user, selectedSubjectId, selectedLevelId, timeRange]);

  // Pie chart data
  const pieData = [
    { name: 'Đúng', value: totalStats.correct, fill: 'hsl(var(--success))' },
    { name: 'Sai', value: totalStats.total - totalStats.correct, fill: 'hsl(var(--destructive))' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', href: '/' },
              { label: 'Thống kê học tập' },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Thống kê học tập</h1>
          <p className="text-muted-foreground">
            Theo dõi tiến trình và hiệu suất học tập của bạn
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Lọc theo:</span>
            </div>

            {/* Time range */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày qua</SelectItem>
                <SelectItem value="14">14 ngày qua</SelectItem>
                <SelectItem value="30">30 ngày qua</SelectItem>
                <SelectItem value="90">90 ngày qua</SelectItem>
              </SelectContent>
            </Select>

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
            {selectedSubjectId !== 'all' && (
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
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Đang tải...</div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tổng số câu hỏi</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    trong {timeRange} ngày qua
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trả lời đúng</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{totalStats.correct}</div>
                  <p className="text-xs text-muted-foreground">
                    câu hỏi
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trả lời sai</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {totalStats.total - totalStats.correct}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    câu hỏi
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tỷ lệ đúng</CardTitle>
                  <Target className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {totalStats.accuracy.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    trung bình
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Daily Activity Chart */}
              <Card className="col-span-full lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Hoạt động theo ngày
                  </CardTitle>
                  <CardDescription>
                    Số câu hỏi đã làm mỗi ngày
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyStats.some(d => d.total > 0) ? (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Tổng số câu"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary) / 0.2)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="correct"
                          name="Trả lời đúng"
                          stroke="hsl(var(--success))"
                          fill="hsl(var(--success) / 0.2)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Chưa có dữ liệu trong khoảng thời gian này
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Accuracy Trend Chart */}
              <Card className="col-span-full lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Tỷ lệ đúng theo ngày
                  </CardTitle>
                  <CardDescription>
                    Phần trăm câu trả lời đúng mỗi ngày
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyStats.some(d => d.total > 0) ? (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <LineChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }} 
                          domain={[0, 100]}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Tỷ lệ đúng']}
                        />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          name="Tỷ lệ đúng"
                          stroke="hsl(var(--accent))"
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Chưa có dữ liệu trong khoảng thời gian này
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Tỷ lệ đúng/sai</CardTitle>
                  <CardDescription>
                    Phân bố câu trả lời trong khoảng thời gian
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {totalStats.total > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Chưa có dữ liệu
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section Stats Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Thống kê theo phần</CardTitle>
                  <CardDescription>
                    Top 10 phần được luyện tập nhiều nhất
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sectionStats.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <BarChart 
                        data={sectionStats} 
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 80, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis 
                          type="category" 
                          dataKey="section_name" 
                          tick={{ fontSize: 11 }}
                          width={75}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="total" 
                          name="Tổng số câu"
                          fill="hsl(var(--primary))" 
                          radius={[0, 4, 4, 0]}
                        />
                        <Bar 
                          dataKey="correct" 
                          name="Trả lời đúng"
                          fill="hsl(var(--success))" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Chưa có dữ liệu
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Gợi ý học tập
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                    <span>Luyện tập đều đặn mỗi ngày để duy trì tiến độ học tập</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                    <span>Tập trung vào các phần có tỷ lệ đúng thấp để cải thiện</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                    <span>Đặt mục tiêu tỷ lệ đúng từ 80% trở lên</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {/* SEO: Mô tả tĩnh */}
        <section className="mt-12 rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Về trang Thống kê học tập</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trang Thống kê học tập giúp bạn theo dõi chi tiết tiến trình ôn luyện theo thời gian. 
            Bạn có thể xem số câu hỏi đã làm, tỷ lệ đúng, biểu đồ hoạt động hàng ngày 
            và phân tích điểm mạnh/yếu theo từng phần kiến thức. Đăng nhập để bắt đầu theo dõi 
            kết quả học tập của bạn.
          </p>
        </section>
      </div>
    </div>
  );
};

export default StatisticsPage;
