/**
 * StartQuizPage - Trang cấu hình trước khi bắt đầu làm bài
 * 
 * URL: /start/:subjectSlug/*
 * VD: /start/jlpt/n5/moji-goi hoặc /start/bjt/nghe
 * 
 * Logic tách riêng cho phần 聴解:
 * - fixed_exam_mode = true: Không chọn số lượng, làm theo đề nghe hoàn chỉnh
 * - Các phần khác: Cho phép random và chọn số lượng như bình thường
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { 
  Play, 
  Clock, 
  HelpCircle, 
  Loader2, 
  Users, 
  Info,
  Lightbulb,
  LogIn,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { QuestionCountSelector } from '@/components/quiz/QuestionCountSelector';
import { ListeningExamSelector } from '@/components/quiz/ListeningExamSelector';
import { ActivityWidget } from '@/components/ui/ActivityWidget';
import { useLeafCategory, useQuestionCountForCategory } from '@/hooks/useCategoryPath';
import { useListeningExams } from '@/hooks/useQuestions';
import { useAudioDurations } from '@/hooks/useAudioDurations';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const QUESTION_COUNTS = [5, 10, 20, 50];

/**
 * Lấy thông tin giới thiệu kỳ thi dựa trên categories
 */
const getExamIntroduction = (
  subjectSlug: string | undefined, 
  categoryNames: string[]
) => {
  // JLPT introductions
  if (subjectSlug === 'jlpt') {
    const levelSlug = categoryNames[0]?.toLowerCase();
    const jlptLevels: Record<string, { description: string; audience: string; structure: string; tips: string[] }> = {
      'n5': {
        description: `Kỳ thi JLPT N5 là cấp độ cơ bản nhất trong hệ thống đánh giá năng lực tiếng Nhật.`,
        audience: `JLPT N5 phù hợp với người mới học tiếng Nhật từ 3-6 tháng.`,
        structure: `Đề thi N5 bao gồm 3 phần chính: Từ vựng - Ngữ pháp, Đọc hiểu và Nghe hiểu.`,
        tips: [
          'Nắm vững bảng chữ Hiragana và Katakana',
          'Học thuộc khoảng 800 từ vựng cơ bản',
          'Làm quen với các mẫu ngữ pháp N5 phổ biến',
          'Luyện nghe với tốc độ chậm, rõ ràng'
        ]
      },
      'n4': {
        description: `Kỳ thi JLPT N4 đánh giá khả năng hiểu tiếng Nhật cơ bản.`,
        audience: `JLPT N4 dành cho người đã hoàn thành N5.`,
        structure: `Đề thi N4 gồm: Từ vựng - Ngữ pháp, Đọc hiểu và Nghe hiểu.`,
        tips: [
          'Mở rộng vốn từ vựng lên khoảng 1.500 từ',
          'Học thêm khoảng 300 Hán tự cơ bản',
          'Luyện đọc các đoạn văn ngắn đơn giản',
          'Tăng cường kỹ năng nghe'
        ]
      },
      'n3': {
        description: `JLPT N3 là cấp độ trung cấp, đánh dấu bước chuyển từ tiếng Nhật cơ bản sang thực dụng.`,
        audience: `JLPT N3 phù hợp với người học tiếng Nhật từ 1-2 năm.`,
        structure: `Đề thi N3 bao gồm: Từ vựng - Ngữ pháp, Đọc hiểu và Nghe hiểu.`,
        tips: [
          'Nắm vững khoảng 3.000 từ vựng và 600 Hán tự',
          'Luyện đọc các bài báo đơn giản',
          'Tập nghe tin tức NHK World',
          'Chú trọng các mẫu ngữ pháp N3'
        ]
      },
      'n2': {
        description: `JLPT N2 là cấp độ cao cấp, đánh giá khả năng hiểu tiếng Nhật thực tế.`,
        audience: `JLPT N2 dành cho người học tiếng Nhật từ 2-3 năm.`,
        structure: `Đề thi N2 gồm: Từ vựng - Ngữ pháp, Đọc hiểu và Nghe hiểu.`,
        tips: [
          'Mở rộng vốn từ lên khoảng 6.000 từ',
          'Đọc báo, tạp chí tiếng Nhật thường xuyên',
          'Luyện nghe các chương trình TV, podcast',
          'Tập viết và diễn đạt ý kiến'
        ]
      },
      'n1': {
        description: `JLPT N1 là cấp độ cao nhất trong hệ thống JLPT.`,
        audience: `JLPT N1 dành cho người đã đạt N2 và muốn nâng cao hơn nữa.`,
        structure: `Đề thi N1 gồm: Từ vựng - Ngữ pháp, Đọc hiểu và Nghe hiểu.`,
        tips: [
          'Nắm vững khoảng 10.000+ từ vựng',
          'Đọc tiểu thuyết, báo chuyên ngành tiếng Nhật',
          'Xem phim, drama không phụ đề',
          'Tích lũy kiến thức văn hóa Nhật Bản'
        ]
      }
    };

    return jlptLevels[levelSlug] || jlptLevels['n5'];
  }

  // Default introduction for other subjects
  const sectionName = categoryNames[categoryNames.length - 1] || 'bài tập';
  return {
    description: `Đây là bài luyện tập phần "${sectionName}" giúp bạn củng cố kiến thức.`,
    audience: `Bài luyện tập này phù hợp với tất cả những ai đang ôn tập.`,
    structure: `Bài luyện tập bao gồm các câu hỏi trắc nghiệm với 4 đáp án A, B, C, D.`,
    tips: [
      'Đọc kỹ câu hỏi trước khi chọn đáp án',
      'Quản lý thời gian hợp lý cho từng câu',
      'Đánh dấu câu khó để quay lại sau',
      'Xem kỹ giải thích sau khi nộp bài'
    ]
  };
};

const StartQuizPage = () => {
  useSEO({
    title: 'Chuẩn bị làm bài | Luyện Đề Thi',
    description: 'Chọn số lượng câu hỏi và bắt đầu luyện thi trắc nghiệm miễn phí.',
  });
  const { subjectSlug, '*': wildcardPath } = useParams<{
    subjectSlug: string;
    '*': string;
  }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  // Parse category path
  const categoryPath = wildcardPath || '';

  // Fetch category data
  const { 
    subject, 
    categories, 
    leafCategory, 
    isLoading: loadingPath 
  } = useLeafCategory(subjectSlug, categoryPath);
  
  // Fetch question count
  const { data: totalQuestions = 0, isLoading: loadingCount } = useQuestionCountForCategory(leafCategory?.id);
  
  // Root category (VD: N5, N2) để map về legacy level
  const rootCategory = categories.length > 0 ? categories[0] : null;
  
  // Fallback: Đếm câu hỏi từ section_id cũ nếu category_id chưa có
  const { data: sectionQuestionCount = 0 } = useQuery({
    queryKey: ['questions-by-section-fallback', subject?.id, leafCategory?.slug, rootCategory?.slug, rootCategory?.name],
    queryFn: async () => {
      if (!leafCategory || !subject) return 0;
      
      // Bước 1: Tìm level thuộc subject và match với root category
      let levelId: string | null = null;
      if (rootCategory) {
        const { data: levelData } = await supabase
          .from('levels')
          .select('id')
          .eq('subject_id', subject.id)
          .or(`slug.eq.${rootCategory.slug},name.eq.${rootCategory.name}`)
          .limit(1)
          .maybeSingle();
        levelId = levelData?.id || null;
      }
      
      // Bước 2: Tìm section với slug matching và level_id đã xác định  
      let query = supabase
        .from('sections')
        .select('id')
        .eq('slug', leafCategory.slug);
      
      if (levelId) {
        query = query.eq('level_id', levelId);
      }
      
      const { data: matchedSection } = await query.limit(1).maybeSingle();
      if (!matchedSection) return 0;
      
      // Đếm câu hỏi từ section (chỉ câu cha)
      const { count } = await supabase
        .from('questions_safe')
        .select('id', { count: 'exact', head: true })
        .eq('section_id', matchedSection.id)
        .is('parent_id', null);
      
      return count || 0;
    },
    enabled: !!leafCategory && !!subject && totalQuestions === 0,
  });
  
  const effectiveQuestionCount = totalQuestions > 0 ? totalQuestions : sectionQuestionCount;
  
  // Fetch listening exams nếu là phần nghe (fixed_exam_mode) hoặc driving
  const isListeningSection = leafCategory?.fixed_exam_mode ?? false;
  
  // Tìm section_id để fetch listening exams (trong giai đoạn chuyển đổi)
  // Cần match subject_id + root category slug/name để tránh trộn cấp độ
  const { data: matchingSection } = useQuery({
    queryKey: ['matching-section', subject?.id, leafCategory?.slug, rootCategory?.slug, rootCategory?.name],
    queryFn: async () => {
      if (!leafCategory || !subject) return null;
      
      // Bước 1: Tìm level thuộc subject và match với root category
      let levelId: string | null = null;
      if (rootCategory) {
        const { data: levelData } = await supabase
          .from('levels')
          .select('id')
          .eq('subject_id', subject.id)
          .or(`slug.eq.${rootCategory.slug},name.eq.${rootCategory.name}`)
          .limit(1)
          .maybeSingle();
        levelId = levelData?.id || null;
      }
      
      // Bước 2: Tìm section với slug matching và level_id đã xác định
      let query = supabase
        .from('sections')
        .select('id, level_id')
        .eq('slug', leafCategory.slug);
      
      if (levelId) {
        query = query.eq('level_id', levelId);
      }
      
      const { data } = await query.limit(1).maybeSingle();
      return data;
    },
    enabled: !!leafCategory && !!subject && (isListeningSection || subjectSlug === 'bang-lai-xe'),
  });
  
  const { data: listeningExams = [], isLoading: loadingListening } = useListeningExams(
    isListeningSection ? matchingSection?.id : undefined,
    isListeningSection ? leafCategory?.id : undefined
  );

  // Get audio URLs for duration calculation
  const listeningAudioUrls = useMemo(
    () => listeningExams.map(e => e.audioUrl),
    [listeningExams]
  );
  const { avgDuration: avgAudioDuration } = useAudioDurations(
    isListeningSection ? listeningAudioUrls : []
  );

  const isDrivingSubject = subjectSlug === 'bang-lai-xe';

  // Fetch driving exams (grouped by audio_url like listening exams)
  const { data: drivingExams = [], isLoading: loadingDrivingExams } = useListeningExams(
    isDrivingSubject ? matchingSection?.id : undefined,
    isDrivingSubject ? leafCategory?.id : undefined
  );

  // State
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Set default count based on available questions
  useEffect(() => {
    if (!isListeningSection && !isDrivingSubject && effectiveQuestionCount > 0) {
      const defaultCount = QUESTION_COUNTS.find((c) => c <= effectiveQuestionCount) || effectiveQuestionCount;
      setQuestionCount(Math.min(defaultCount, effectiveQuestionCount));
    }
  }, [effectiveQuestionCount, isListeningSection, isDrivingSubject]);

  const handleSelectListeningExam = useCallback((examIndex: number) => {
    navigate(`/quiz/${subjectSlug}/${categoryPath}?mode=listening&exam=${examIndex}`);
  }, [navigate, subjectSlug, categoryPath]);

  // Fetch completed exams from question_history for logged-in users
  const { data: completedIndices = new Set<number>() } = useQuery({
    queryKey: ['completed-listening-exams', leafCategory?.id, matchingSection?.id, user?.id],
    queryFn: async () => {
      if (!user || listeningExams.length === 0) return new Set<number>();
      
      const allQuestionIds: string[] = [];
      for (const exam of listeningExams) {
        for (const q of exam.questions) {
          if (q.subQuestions && q.subQuestions.length > 0) {
            q.subQuestions.forEach(sq => allQuestionIds.push(sq.id));
          } else {
            allQuestionIds.push(q.id);
          }
        }
      }
      
      if (allQuestionIds.length === 0) return new Set<number>();
      
      const { data, error } = await supabase
        .from('question_history')
        .select('question_id')
        .eq('user_id', user.id)
        .in('question_id', allQuestionIds);
      
      if (error || !data) return new Set<number>();
      
      const answeredIds = new Set(data.map(d => d.question_id));
      
      const completed = new Set<number>();
      listeningExams.forEach((exam, index) => {
        const examQuestionIds: string[] = [];
        for (const q of exam.questions) {
          if (q.subQuestions && q.subQuestions.length > 0) {
            q.subQuestions.forEach(sq => examQuestionIds.push(sq.id));
          } else {
            examQuestionIds.push(q.id);
          }
        }
        if (examQuestionIds.some(id => answeredIds.has(id))) {
          completed.add(index);
        }
      });
      
      return completed;
    },
    enabled: !!user && isListeningSection && listeningExams.length > 0,
  });

  const isLoading = authLoading || loadingPath || loadingCount || (isListeningSection && loadingListening) || (isDrivingSubject && loadingDrivingExams);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect nếu không tìm thấy
  if (!subject || !leafCategory) {
    return <Navigate to="/subjects" replace />;
  }

  // Guest users can now access quizzes freely (no login gate)

  const handleStartQuiz = () => {
    if (isDrivingSubject) {
      navigate(`/quiz/${subjectSlug}/${categoryPath}?mode=driving`);
    } else {
      navigate(`/quiz/${subjectSlug}/${categoryPath}?count=${questionCount}`);
    }
  };

  // Tính thời gian ước tính
  const estimatedMinutes = isListeningSection 
    ? (avgAudioDuration > 0 ? Math.ceil(avgAudioDuration / 60) : 0)
    : Math.ceil(questionCount * 1.5);

  // Lấy thông tin giới thiệu
  const categoryNames = categories.map(c => c.name);
  const introduction = getExamIntroduction(subjectSlug, categoryNames);

  // Build breadcrumb
  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: 'Chọn môn học', href: '/subjects' },
    { label: subject.name, href: `/subjects/${subject.slug}` },
  ];
  
  let pathSoFar = '';
  categories.forEach((cat, idx) => {
    pathSoFar = pathSoFar ? `${pathSoFar}/${cat.slug}` : cat.slug;
    breadcrumbItems.push({
      label: cat.name,
      href: `/subjects/${subject.slug}/${pathSoFar}`,
    });
  });
  breadcrumbItems.push({ label: 'Bắt đầu làm bài' });

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb + Activity Widget */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <Breadcrumb items={breadcrumbItems} />
          <ActivityWidget variant="compact" className="hidden sm:flex" />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content - Quiz configuration */}
          <div className="lg:col-span-2 lg:order-2">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-4xl">
                  {leafCategory.icon || '📝'}
                </div>
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                  Luyện tập: {leafCategory.name}
                </h1>
                <p className="text-muted-foreground">
                  {subject.name} - {categories.map(c => c.name).join(' / ')}
                </p>
              </div>

              {/* Stats */}
              {!isListeningSection && (
                <div className="mb-8 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
                    <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng câu hỏi</p>
                      <p className="font-semibold text-foreground">{effectiveQuestionCount} câu</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Thời gian ước tính</p>
                      <p className="font-semibold text-foreground">~{estimatedMinutes} phút</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Question count selector hoặc Listening exam selector hoặc Driving */}
              <div className="mb-8">
              {isDrivingSubject ? (
                  <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-5 text-center space-y-3">
                    <div className="text-4xl">🚗</div>
                    <p className="font-semibold text-foreground">
                      {drivingExams.length} đề thi
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Làm toàn bộ đề thi với định dạng Đúng (○) / Sai (✕)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cần đạt ≥ 90% để đậu (tiêu chuẩn thi thật tại Nhật)
                    </p>
                  </div>
                ) : isListeningSection ? (
                  <ListeningExamSelector
                    exams={listeningExams}
                    completedExamIndices={completedIndices}
                    isLoggedIn={!!user}
                    onSelectExam={handleSelectListeningExam}
                  />
                ) : (
                  <QuestionCountSelector
                    counts={QUESTION_COUNTS}
                    selectedCount={questionCount}
                    maxAvailable={effectiveQuestionCount}
                    onSelect={setQuestionCount}
                  />
                )}
              </div>

              {/* Start button - hidden for listening (user clicks exam directly) */}
              {!isListeningSection && (
                <Button
                  onClick={handleStartQuiz}
                  size="lg"
                  className="w-full gap-2"
                  disabled={
                    isDrivingSubject
                      ? drivingExams.length === 0
                      : effectiveQuestionCount === 0
                  }
                >
                  {isDrivingSubject ? (
                    <span className="text-lg">🚗</span>
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  {isDrivingSubject
                    ? `Bắt đầu thi (${drivingExams.length} đề)`
                    : `Bắt đầu làm bài (${questionCount} câu)`
                  }
                </Button>
              )}

              {!isListeningSection && effectiveQuestionCount === 0 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Chưa có câu hỏi nào cho phần này. Vui lòng quay lại sau.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - Introduction */}
          <div className="lg:col-span-1 lg:order-1 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Info className="h-5 w-5" />
                <h2 className="font-semibold">Giới thiệu kỳ thi</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {introduction.description}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Users className="h-5 w-5" />
                <h2 className="font-semibold">Đối tượng phù hợp</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {introduction.audience}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Lightbulb className="h-5 w-5" />
                <h2 className="font-semibold">Mẹo ôn thi</h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {introduction.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartQuizPage;
