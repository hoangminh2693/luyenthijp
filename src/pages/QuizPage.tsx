import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { ResultSummary } from '@/components/quiz/ResultSummary';
import { Breadcrumb } from '@/components/layout/Header';
import {
  getExamById,
  getQuestionsByExam,
  calculateResult,
  getSectionById,
  getLevelById,
  getSubjectById,
  type QuizResult,
} from '@/data/quizData';

/**
 * QuizPage - Trang làm bài thi
 */
const QuizPage = () => {
  const { examId } = useParams<{ examId: string }>();
  
  // State quản lý bài thi
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Lấy thông tin đề thi và câu hỏi
  const exam = examId ? getExamById(examId) : undefined;
  const questions = examId ? getQuestionsByExam(examId) : [];
  const section = exam ? getSectionById(exam.sectionId) : undefined;
  const level = section ? getLevelById(section.levelId) : undefined;
  const subject = level ? getSubjectById(level.subjectId) : undefined;

  // Scroll to top khi component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [examId]);

  // Nếu không tìm thấy đề thi
  if (!exam || !section || !level || !subject) {
    return <Navigate to="/subjects" replace />;
  }

  // Xử lý chọn đáp án
  const handleSelectAnswer = useCallback((questionId: string, answer: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, [isSubmitted]);

  // Xử lý nộp bài
  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;
    
    const quizResult = calculateResult(exam.id, answers);
    setResult(quizResult);
    setIsSubmitted(true);
    
    // Scroll to top để xem kết quả
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [exam.id, answers, isSubmitted]);

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
  const backUrl = `/subjects/${subject.slug}/${level.slug}/${section.slug}`;

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
              { label: exam.name },
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
              Quay lại danh sách đề
            </Link>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {exam.name}
            </h1>
            <p className="text-muted-foreground">{exam.description}</p>
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
                examName={exam.name}
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
            {questions.map((question, index) => (
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
                />
              </div>
            ))}

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
