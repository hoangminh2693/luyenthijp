/**
 * StartQuizPage - Trang cấu hình trước khi bắt đầu làm bài
 * Bao gồm giới thiệu chi tiết về kỳ thi và cho phép chọn số lượng câu hỏi
 */
import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Clock, 
  HelpCircle, 
  Loader2, 
  Target, 
  Users, 
  BookOpen, 
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { QuestionCountSelector } from '@/components/quiz/QuestionCountSelector';
import { useSubjectBySlug, useLevelBySlug, useSectionBySlug } from '@/hooks/useSections';
import { useQuestionCount } from '@/hooks/useQuestions';

const QUESTION_COUNTS = [5, 10, 20, 50];

/**
 * Lấy thông tin giới thiệu kỳ thi dựa trên subject và level
 */
const getExamIntroduction = (
  subjectSlug: string | undefined, 
  levelSlug: string | undefined,
  sectionName: string
) => {
  // JLPT introductions
  if (subjectSlug === 'tieng-nhat' || subjectSlug === 'jlpt') {
    const jlptLevels: Record<string, { description: string; audience: string; structure: string; tips: string[] }> = {
      'n5': {
        description: `Kỳ thi JLPT N5 là cấp độ cơ bản nhất trong hệ thống đánh giá năng lực tiếng Nhật. Đây là bước đầu tiên cho những ai mới bắt đầu học tiếng Nhật, giúp đánh giá khả năng hiểu các biểu thức cơ bản trong giao tiếp hàng ngày.`,
        audience: `JLPT N5 phù hợp với người mới học tiếng Nhật từ 3-6 tháng, sinh viên năm nhất ngành Nhật ngữ, hoặc những ai đang chuẩn bị sang Nhật du học/làm việc và cần chứng chỉ cơ bản về tiếng Nhật.`,
        structure: `Đề thi N5 bao gồm 3 phần chính: Từ vựng - Ngữ pháp (文字・語彙・文法), Đọc hiểu (読解) và Nghe hiểu (聴解). Tổng thời gian làm bài khoảng 90 phút với khoảng 80-100 câu hỏi trắc nghiệm.`,
        tips: [
          'Nắm vững bảng chữ Hiragana và Katakana',
          'Học thuộc khoảng 800 từ vựng cơ bản',
          'Làm quen với các mẫu ngữ pháp N5 phổ biến',
          'Luyện nghe với tốc độ chậm, rõ ràng'
        ]
      },
      'n4': {
        description: `Kỳ thi JLPT N4 đánh giá khả năng hiểu tiếng Nhật cơ bản trong các tình huống giao tiếp thường ngày. Đây là cấp độ phổ biến cho người học tiếng Nhật từ 6-12 tháng.`,
        audience: `JLPT N4 dành cho người đã hoàn thành N5, sinh viên năm hai ngành Nhật ngữ, người lao động Việt Nam muốn nâng cao trình độ tiếng Nhật để giao tiếp tốt hơn trong công việc.`,
        structure: `Đề thi N4 gồm: Từ vựng - Ngữ pháp (文字・語彙・文法), Đọc hiểu (読解) và Nghe hiểu (聴解). Thời gian làm bài khoảng 125 phút với độ khó cao hơn N5 đáng kể.`,
        tips: [
          'Mở rộng vốn từ vựng lên khoảng 1.500 từ',
          'Học thêm khoảng 300 Hán tự cơ bản',
          'Luyện đọc các đoạn văn ngắn đơn giản',
          'Tăng cường kỹ năng nghe với các đoạn hội thoại dài hơn'
        ]
      },
      'n3': {
        description: `JLPT N3 là cấp độ trung cấp, đánh dấu bước chuyển quan trọng từ tiếng Nhật cơ bản sang tiếng Nhật thực dụng. Cấp độ này yêu cầu khả năng hiểu tiếng Nhật trong nhiều tình huống đa dạng hơn.`,
        audience: `JLPT N3 phù hợp với người học tiếng Nhật từ 1-2 năm, nhân viên công ty Nhật muốn nâng cao năng lực giao tiếp, hoặc người chuẩn bị thi lên N2 trong tương lai gần.`,
        structure: `Đề thi N3 bao gồm: Từ vựng - Ngữ pháp (文字・語彙・文法), Đọc hiểu (読解) và Nghe hiểu (聴解). Tổng thời gian khoảng 140 phút với nội dung phong phú và yêu cầu cao hơn.`,
        tips: [
          'Nắm vững khoảng 3.000 từ vựng và 600 Hán tự',
          'Luyện đọc các bài báo đơn giản bằng tiếng Nhật',
          'Tập nghe tin tức NHK World dành cho người học',
          'Chú trọng các mẫu ngữ pháp N3 thường gặp trong đời sống'
        ]
      },
      'n2': {
        description: `JLPT N2 là cấp độ cao cấp, đánh giá khả năng hiểu tiếng Nhật trong hầu hết các tình huống thực tế. Đây là chứng chỉ được nhiều công ty Nhật yêu cầu khi tuyển dụng nhân sự nước ngoài.`,
        audience: `JLPT N2 dành cho người học tiếng Nhật từ 2-3 năm, nhân viên muốn thăng tiến trong công ty Nhật, du học sinh chuẩn bị vào đại học Nhật Bản, hoặc kỹ sư/chuyên gia muốn làm việc tại Nhật.`,
        structure: `Đề thi N2 gồm: Từ vựng - Ngữ pháp (文字・語彙・文法), Đọc hiểu (読解) và Nghe hiểu (聴解). Thời gian làm bài khoảng 155 phút với độ khó cao và yêu cầu hiểu sâu tiếng Nhật.`,
        tips: [
          'Mở rộng vốn từ lên khoảng 6.000 từ và 1.000 Hán tự',
          'Đọc báo, tạp chí tiếng Nhật thường xuyên',
          'Luyện nghe các chương trình TV, podcast tiếng Nhật',
          'Tập viết và diễn đạt ý kiến bằng tiếng Nhật'
        ]
      },
      'n1': {
        description: `JLPT N1 là cấp độ cao nhất trong hệ thống JLPT, đánh giá khả năng sử dụng tiếng Nhật thành thạo trong mọi tình huống. Chứng chỉ N1 là mục tiêu cao nhất của người học tiếng Nhật.`,
        audience: `JLPT N1 dành cho người đã đạt N2 và muốn nâng cao hơn nữa, phiên dịch viên/biên dịch viên tiếng Nhật, giảng viên tiếng Nhật, hoặc chuyên gia làm việc trong môi trường hoàn toàn tiếng Nhật.`,
        structure: `Đề thi N1 gồm: Từ vựng - Ngữ pháp (文字・語彙・文法), Đọc hiểu (読解) và Nghe hiểu (聴解). Thời gian khoảng 170 phút với các nội dung phức tạp, chuyên sâu từ nhiều lĩnh vực.`,
        tips: [
          'Nắm vững khoảng 10.000+ từ vựng và 2.000 Hán tự',
          'Đọc tiểu thuyết, báo chuyên ngành tiếng Nhật',
          'Xem phim, drama không phụ đề để luyện nghe',
          'Tích lũy kiến thức văn hóa và xã hội Nhật Bản'
        ]
      }
    };

    const levelInfo = jlptLevels[levelSlug || ''] || jlptLevels['n5'];
    return levelInfo;
  }

  // Default introduction for other subjects
  return {
    description: `Đây là bài luyện tập phần "${sectionName}" giúp bạn củng cố kiến thức và chuẩn bị tốt hơn cho kỳ thi. Mỗi câu hỏi được thiết kế theo chuẩn đề thi thực tế, giúp bạn làm quen với định dạng và độ khó của kỳ thi.`,
    audience: `Bài luyện tập này phù hợp với tất cả những ai đang ôn tập và chuẩn bị cho kỳ thi. Dù bạn là người mới bắt đầu hay đã có kinh nghiệm, việc luyện tập thường xuyên sẽ giúp bạn nắm vững kiến thức và tự tin hơn khi bước vào phòng thi.`,
    structure: `Bài luyện tập bao gồm các câu hỏi trắc nghiệm với 4 đáp án A, B, C, D. Sau khi nộp bài, bạn sẽ xem được kết quả chi tiết với đáp án đúng và giải thích cho từng câu hỏi.`,
    tips: [
      'Đọc kỹ câu hỏi trước khi chọn đáp án',
      'Quản lý thời gian hợp lý cho từng câu',
      'Đánh dấu câu khó để quay lại sau',
      'Xem kỹ giải thích sau khi nộp bài để học hỏi'
    ]
  };
};

const StartQuizPage = () => {
  const { subjectSlug, levelSlug, sectionSlug } = useParams<{
    subjectSlug: string;
    levelSlug: string;
    sectionSlug: string;
  }>();
  const navigate = useNavigate();

  // Fetch dữ liệu từ Supabase
  const { data: subject, isLoading: loadingSubject } = useSubjectBySlug(subjectSlug);
  const { data: level, isLoading: loadingLevel } = useLevelBySlug(subject?.id, levelSlug);
  const { data: section, isLoading: loadingSection } = useSectionBySlug(level?.id, sectionSlug);
  const { data: totalQuestions = 0, isLoading: loadingCount } = useQuestionCount(section?.id);

  // State
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Set default count based on available questions
  useEffect(() => {
    if (totalQuestions > 0) {
      const defaultCount = QUESTION_COUNTS.find((c) => c <= totalQuestions) || totalQuestions;
      setQuestionCount(Math.min(defaultCount, totalQuestions));
    }
  }, [totalQuestions]);

  const isLoading = loadingSubject || loadingLevel || loadingSection || loadingCount;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect nếu không tìm thấy
  if (!subject) return <Navigate to="/subjects" replace />;
  if (!level) return <Navigate to={`/subjects/${subjectSlug}`} replace />;
  if (!section) return <Navigate to={`/subjects/${subjectSlug}/${levelSlug}`} replace />;

  const handleStartQuiz = () => {
    navigate(`/quiz/${subjectSlug}/${levelSlug}/${sectionSlug}?count=${questionCount}`);
  };

  // Tính thời gian ước tính (1.5 phút / câu)
  const estimatedMinutes = Math.ceil(questionCount * 1.5);

  // Lấy thông tin giới thiệu
  const introduction = getExamIntroduction(subjectSlug, levelSlug, section.name);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Chọn môn học', href: '/subjects' },
              { label: subject.name, href: `/subjects/${subject.slug}` },
              { label: level.name, href: `/subjects/${subject.slug}/${level.slug}` },
              { label: section.name, href: `/subjects/${subject.slug}/${level.slug}/${section.slug}` },
              { label: 'Bắt đầu làm bài' },
            ]}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content - Quiz configuration */}
          <div className="lg:col-span-2 lg:order-2">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-4xl">
                  {section.icon || '📝'}
                </div>
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                  Luyện tập: {section.name}
                </h1>
                <p className="text-muted-foreground">
                  {subject.name} - {level.name}
                </p>
              </div>

              {/* Stats */}
              <div className="mb-8 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
                  <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng câu hỏi</p>
                    <p className="font-semibold text-foreground">{totalQuestions} câu</p>
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

              {/* Question count selector */}
              <div className="mb-8">
                <QuestionCountSelector
                  counts={QUESTION_COUNTS}
                  selectedCount={questionCount}
                  maxAvailable={totalQuestions}
                  onSelect={setQuestionCount}
                />
              </div>

              {/* Start button */}
              <Button
                onClick={handleStartQuiz}
                size="lg"
                className="w-full gap-2"
                disabled={totalQuestions === 0}
              >
                <Play className="h-5 w-5" />
                Bắt đầu làm bài ({questionCount} câu)
              </Button>

              {totalQuestions === 0 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Chưa có câu hỏi nào cho phần này. Vui lòng quay lại sau.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - Introduction */}
          <div className="lg:col-span-1 lg:order-1 space-y-6">
            {/* About this exam */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Info className="h-5 w-5" />
                <h2 className="font-semibold">Giới thiệu kỳ thi</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {introduction.description}
              </p>
            </div>

            {/* Target audience */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Users className="h-5 w-5" />
                <h2 className="font-semibold">Đối tượng phù hợp</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {introduction.audience}
              </p>
            </div>

            {/* Exam structure */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary mb-4">
                <BookOpen className="h-5 w-5" />
                <h2 className="font-semibold">Cấu trúc đề thi</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {introduction.structure}
              </p>
            </div>

            {/* Tips */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Lightbulb className="h-5 w-5" />
                <h2 className="font-semibold">Mẹo làm bài</h2>
              </div>
              <ul className="space-y-2">
                {introduction.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Ad placeholder - future AdSense location */}
        <div className="mt-8">
          {/* Ad slot placeholder - do not remove */}
        </div>
      </div>
    </div>
  );
};

export default StartQuizPage;
