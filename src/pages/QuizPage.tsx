import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, Navigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { ResultSummary } from '@/components/quiz/ResultSummary';
import { Breadcrumb } from '@/components/layout/Header';
import { useQuestionHistory } from '@/hooks/useQuestionHistory';
import {
  getExamById,
  getQuestionsByExam,
  getRandomQuestions,
  getSectionBySlug,
  getLevelBySlug,
  getSubjectBySlug,
  type Question,
  type QuizResult,
} from '@/data/quizData';

/**
 * QuizPage - Trang làm bài thi
 * Hỗ trợ 2 mode:
 * - Mode đề thi: /exam/:examId
 * - Mode random: /quiz/:subjectSlug/:levelSlug/:sectionSlug?count=N
 */
const QuizPage = () => {
  const { examId, subjectSlug, levelSlug, sectionSlug } = useParams<{ 
    examId?: string; 
    subjectSlug?: string;
    levelSlug?: string;
    sectionSlug?: string;
  }>();
  const [searchParams] = useSearchParams();
  const questionCount = parseInt(searchParams.get('count') || '10', 10);
  
  // State quản lý bài thi
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Question history hook
  const { saveAnswer, getQuestionStats } = useQuestionHistory();

  // Xác định mode và lấy dữ liệu
  const isExamMode = !!examId;
  
  // Lấy thông tin cho random mode
  const subject = subjectSlug ? getSubjectBySlug(subjectSlug) : undefined;
  const level = subject && levelSlug ? getLevelBySlug(subject.id, levelSlug) : undefined;
  const section = level && sectionSlug ? getSectionBySlug(level.id, sectionSlug) : undefined;
  
  // Lấy thông tin cho exam mode
  const exam = examId ? getExamById(examId) : undefined;

  // Lấy danh sách câu hỏi - useMemo để giữ stable
  const questions: Question[] = useMemo(() => {
    if (isExamMode && examId) {
      return getQuestionsByExam(examId);
    } else if (section) {
      return getRandomQuestions(section.id, questionCount);
    }
    return [];
  }, [isExamMode, examId, section?.id, questionCount]);

  // Breadcrumb info
  const breadcrumbSubject = subject;
  const breadcrumbLevel = level;
  const breadcrumbSection = section;

  // Scroll to top khi component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [examId, sectionSlug]);

  // Nếu không tìm thấy dữ liệu
  if (isExamMode && !exam) {
    return <Navigate to="/subjects" replace />;
  }
  
  if (!isExamMode && (!subject || !level || !section)) {
    return <Navigate to="/subjects" replace />;
  }

  // Xử lý chọn đáp án
  const handleSelectAnswer = useCallback((questionId: string, answer: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, [isSubmitted]);

  // Xử lý nộp bài
  const handleSubmit = useCallback(async () => {
    if (isSubmitted) return;
    
    // Tính kết quả
    const details = questions.map((q) => ({
      questionId: q.id,
      userAnswer: answers[q.id] || null,
      correctAnswer: q.correctOption,
      isCorrect: answers[q.id] === q.correctOption,
    }));

    const correctAnswers = details.filter((d) => d.isCorrect).length;
    const totalQuestions = questions.length;

    const quizResult: QuizResult = {
      totalQuestions,
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      score: correctAnswers,
      percentage: Math.round((correctAnswers / totalQuestions) * 100),
      details,
    };

    setResult(quizResult);
    setIsSubmitted(true);
    
    // Lưu lịch sử làm bài
    for (const detail of details) {
      if (detail.userAnswer) {
        await saveAnswer(detail.questionId, detail.userAnswer, detail.isCorrect);
      }
    }
    
    // Scroll to top để xem kết quả
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [answers, isSubmitted, questions, saveAnswer]);

  // Xử lý làm lại bài
  const handleRetry = useCallback(() => {
    setAnswers({});
    setIsSubmitted(false);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Scroll đến câu hỏi cụ thể
  const scrollToQuestion = useCallback((index: number) => {
    questionRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  const answeredCount = Object.keys(answers).length;
  const questionIds = questions.map((q) => q.id);
  
  // Back URL
  const backUrl = isExamMode 
    ? `/subjects` 
    : `/subjects/${subjectSlug}/${levelSlug}/${sectionSlug}`;

  // Title
  const pageTitle = isExamMode 
    ? exam?.name || 'Đề thi'
    : `${breadcrumbSection?.name || ''} - ${questionCount} câu`;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Chọn môn học', href: '/subjects' },
              ...(breadcrumbSubject ? [{ label: breadcrumbSubject.name, href: `/subjects/${breadcrumbSubject.slug}` }] : []),
              ...(breadcrumbLevel ? [{ label: breadcrumbLevel.name, href: `/subjects/${breadcrumbSubject?.slug}/${breadcrumbLevel.slug}` }] : []),
              ...(breadcrumbSection ? [{ label: breadcrumbSection.name, href: backUrl }] : []),
              { label: 'Làm bài' },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to={backUrl}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Link>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {pageTitle}
            </h1>
            <p className="text-muted-foreground">
              {questions.length} câu hỏi
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Questions column */}
          <div className="space-y-6">
            {/* Result summary - hiển thị sau khi nộp bài */}
            {isSubmitted && result && (
              <ResultSummary
                result={result}
                examName={pageTitle}
                onRetry={handleRetry}
              />
            )}

            {/* Section title for review */}
            {isSubmitted && (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Chi tiết bài làm
                </h2>
                <span className="text-muted-foreground">
                  (Xem lại đáp án đúng và sai)
                </span>
              </div>
            )}

            {/* Questions list */}
            {questions.map((question, index) => {
              const stats = getQuestionStats(question.id);
              
              return (
                <div
                  key={question.id}
                  ref={(el) => (questionRefs.current[index] = el)}
                >
                  <QuestionCard
                    question={question}
                    questionNumber={index + 1}
                    selectedAnswer={answers[question.id] || null}
                    onSelectAnswer={(answer) =>
                      handleSelectAnswer(question.id, answer)
                    }
                    showResult={isSubmitted}
                    isSubmitted={isSubmitted}
                    historyStats={stats}
                  />
                </div>
              );
            })}

            {/* Submit button - mobile */}
            {!isSubmitted && (
              <div className="lg:hidden">
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="w-full gap-2"
                  disabled={answeredCount === 0}
                >
                  <Send className="h-5 w-5" />
                  Nộp bài ({answeredCount}/{questions.length} câu)
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar - Progress & Submit */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <QuizProgress
                totalQuestions={questions.length}
                answeredQuestions={answeredCount}
                answers={answers}
                questionIds={questionIds}
                onQuestionClick={scrollToQuestion}
              />

              {!isSubmitted && (
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="w-full gap-2"
                  disabled={answeredCount === 0}
                >
                  <Send className="h-5 w-5" />
                  Nộp bài
                </Button>
              )}

              {!isSubmitted && answeredCount < questions.length && (
                <p className="text-center text-sm text-muted-foreground">
                  Bạn còn {questions.length - answeredCount} câu chưa trả lời
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
