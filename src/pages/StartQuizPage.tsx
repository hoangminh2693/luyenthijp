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
import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
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
  
  // Lấy level category (thường là category đầu tiên, VD: N5, N2...)
  const levelCategoryForCount = categories.length > 0 ? categories[0] : null;
  
  // Fallback: Đếm câu hỏi từ section_id cũ nếu category_id chưa có
  const { data: sectionQuestionCount = 0 } = useQuery({
    queryKey: ['questions-by-section-fallback', leafCategory?.id, leafCategory?.slug, levelCategoryForCount?.name],
    queryFn: async () => {
      if (!leafCategory) return 0;
      
      // Tìm section có slug matching VÀ level.name matching với level category
      let query = supabase
        .from('sections')
        .select('id, levels!inner(name)')
        .eq('slug', leafCategory.slug);
      
      if (levelCategoryForCount) {
        query = query.eq('levels.name', levelCategoryForCount.name);
      }
      
      const { data: sections } = await query.limit(1);
      
      if (!sections || sections.length === 0) return 0;
      
      // Đếm câu hỏi từ section (chỉ lấy 1 section đúng)
      const { count } = await supabase
        .from('questions_safe')
        .select('id', { count: 'exact', head: true })
        .eq('section_id', sections[0].id)
        .is('parent_id', null);
      
      return count || 0;
    },
    enabled: !!leafCategory && totalQuestions === 0,
  });
  
  const effectiveQuestionCount = totalQuestions > 0 ? totalQuestions : sectionQuestionCount;
  
  // Fetch listening exams nếu là phần nghe (fixed_exam_mode)
  const isListeningSection = leafCategory?.fixed_exam_mode ?? false;
  
  // Lấy level category (thường là category đầu tiên, VD: N5, N2...)
  const levelCategory = categories.length > 0 ? categories[0] : null;
  
  // Tìm section_id để fetch listening exams (trong giai đoạn chuyển đổi)
  // Cần match cả section.slug VÀ level.name để tránh lẫn lộn giữa các cấp độ
  const { data: matchingSection } = useQuery({
    queryKey: ['matching-section', leafCategory?.slug, levelCategory?.name],
    queryFn: async () => {
      if (!leafCategory) return null;
      
      // Tìm section có slug khớp với category VÀ level.name khớp với level category
      let query = supabase
        .from('sections')
        .select('id, level_id, levels!inner(name, slug)')
        .eq('slug', leafCategory.slug);
      
      // Match với level category nếu có
      if (levelCategory) {
        query = query.eq('levels.name', levelCategory.name);
      }
      
      const { data } = await query.limit(1).maybeSingle();
      
      return data;
    },
    enabled: !!leafCategory && isListeningSection,
  });
  
  const { data: listeningExams = [], isLoading: loadingListening } = useListeningExams(
    isListeningSection ? matchingSection?.id : undefined
  );

  // State
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Set default count based on available questions
  useEffect(() => {
    if (!isListeningSection && effectiveQuestionCount > 0) {
      const defaultCount = QUESTION_COUNTS.find((c) => c <= effectiveQuestionCount) || effectiveQuestionCount;
      setQuestionCount(Math.min(defaultCount, effectiveQuestionCount));
    }
  }, [effectiveQuestionCount, isListeningSection]);

  const isLoading = authLoading || loadingPath || loadingCount || (isListeningSection && loadingListening);

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

  // Yêu cầu đăng nhập trước khi làm bài
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mx-auto max-w-md text-center">
            <LogIn className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Đăng nhập để làm bài</h1>
            <p className="mb-6 text-muted-foreground">
              Bạn cần đăng nhập để làm bài và lưu kết quả vào lịch sử học tập.
            </p>
            <div className="space-y-3">
              <Link to="/auth" state={{ from: `/start/${subjectSlug}/${categoryPath}` }}>
                <Button className="w-full gap-2">
                  <LogIn className="h-4 w-4" />
                  Đăng nhập ngay
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Chưa có tài khoản?{' '}
                <Link to="/auth" className="text-primary hover:underline">
                  Đăng ký miễn phí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleStartQuiz = () => {
    if (isListeningSection) {
      navigate(`/quiz/${subjectSlug}/${categoryPath}?mode=listening`);
    } else {
      navigate(`/quiz/${subjectSlug}/${categoryPath}?count=${questionCount}`);
    }
  };

  // Tính thời gian ước tính
  const listeningQuestionCount = listeningExams.length > 0 
    ? Math.round(listeningExams.reduce((sum, e) => sum + e.questionCount, 0) / listeningExams.length)
    : 0;
  const estimatedMinutes = isListeningSection 
    ? Math.ceil(listeningQuestionCount * 2)
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

              {/* Question count selector hoặc Listening exam selector */}
              <div className="mb-8">
                {isListeningSection ? (
                  <ListeningExamSelector
                    totalExams={listeningExams.length}
                    questionCount={listeningQuestionCount}
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

              {/* Start button */}
              <Button
                onClick={handleStartQuiz}
                size="lg"
                className="w-full gap-2"
                disabled={isListeningSection ? listeningExams.length === 0 : effectiveQuestionCount === 0}
              >
                {isListeningSection ? (
                  <Headphones className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                {isListeningSection 
                  ? 'Bắt đầu làm đề nghe'
                  : `Bắt đầu làm bài (${questionCount} câu)`
                }
              </Button>

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
