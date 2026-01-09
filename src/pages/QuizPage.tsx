import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, Navigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { ResultSummary } from '@/components/quiz/ResultSummary';
import { Breadcrumb } from '@/components/layout/Header';
import { useQuestionHistory } from '@/hooks/useQuestionHistory';
import { useSubjectBySlug, useLevelBySlug, useSectionBySlug } from '@/hooks/useSections';
import { useRandomQuestions, type Question } from '@/hooks/useQuestions';
import { type QuizResult } from '@/data/quizData';

/**
 * QuizPage - Trang làm bài thi
 * Mode random: /quiz/:subjectSlug/:levelSlug/:sectionSlug?count=N
 */
const QuizPage = () => {
  const { subjectSlug, levelSlug, sectionSlug } = useParams<{ 
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

  // Fetch dữ liệu từ Supabase
  const { data: subject, isLoading: loadingSubject } = useSubjectBySlug(subjectSlug);
  const { data: level, isLoading: loadingLevel } = useLevelBySlug(subject?.id, levelSlug);
  const { data: section, isLoading: loadingSection } = useSectionBySlug(level?.id, sectionSlug);
  const { data: questions = [], isLoading: loadingQuestions } = useRandomQuestions(section?.id, questionCount);

  // Scroll to top khi component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sectionSlug]);

  const isLoading = loadingSubject || loadingLevel || loadingSection || loadingQuestions;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Nếu không tìm thấy dữ liệu
  if (!subject || !level || !section) {
    return <Navigate to="/subjects" replace />;
  }

  // Xử lý chọn đáp án
  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  // Xử lý nộp bài
  const handleSubmit = async () => {
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
  };

  // Xử lý làm lại bài
  const handleRetry = () => {
    setAnswers({});
    setIsSubmitted(false);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll đến câu hỏi cụ thể
  const scrollToQuestion = (index: number) => {
    questionRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const answeredCount = Object.keys(answers).length;
  const questionIds = questions.map((q) => q.id);
  
  // Back URL
  const backUrl = `/subjects/${subjectSlug}/${levelSlug}/${sectionSlug}`;

  // Title
  const pageTitle = `${section.name} - ${questionCount} câu`;

  // Convert questions to the format expected by QuestionCard
  const mappedQuestions = questions.map(q => ({
    id: q.id,
    examId: '', // Not used in random mode
    content: q.content,
    options: q.options,
    correctOption: q.correctOption,
    explanation: q.explanation,
  }));

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Chọn môn học', href: '/subjects' },
              { label: subject.name, href: `/subjects/${subject.slug}` },
              { label: level.name, href: `/subjects/${subject.slug}/${level.slug}` },
              { label: section.name, href: backUrl },
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
            {mappedQuestions.map((question, index) => {
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

            {/* Empty state */}
            {questions.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  Không có câu hỏi nào. Vui lòng quay lại và thử lại.
                </p>
              </div>
            )}

            {/* Submit button - mobile */}
            {!isSubmitted && questions.length > 0 && (
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

              {!isSubmitted && questions.length > 0 && (
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
