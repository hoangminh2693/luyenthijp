import { useState, useRef, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * QuizPage - Trang làm bài thi
 * Mode random: /quiz/:subjectSlug/:levelSlug/:sectionSlug?count=N
 * SECURE: Correct answers are only revealed after server-side submission
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
  const [subAnswers, setSubAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  // Store revealed answers after submission
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, { correctOption: string; explanation?: string }>>({});
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Question history hook
  const { getQuestionStats } = useQuestionHistory();

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

  // Xử lý chọn đáp án cho câu hỏi con
  const handleSelectSubAnswer = (subQuestionId: string, answer: string) => {
    if (isSubmitted) return;
    setSubAnswers((prev) => ({ ...prev, [subQuestionId]: answer }));
  };

  // Xử lý nộp bài - SECURE: Submit to server for validation
  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Collect all answers for submission
      const answersToSubmit: { question_id: string; selected_answer: string }[] = [];
      
      for (const q of questions) {
        if (q.subQuestions && q.subQuestions.length > 0) {
          // Sub-questions
          for (const subQ of q.subQuestions) {
            if (subAnswers[subQ.id]) {
              answersToSubmit.push({
                question_id: subQ.id,
                selected_answer: subAnswers[subQ.id],
              });
            }
          }
        } else {
          // Regular question
          if (answers[q.id]) {
            answersToSubmit.push({
              question_id: q.id,
              selected_answer: answers[q.id],
            });
          }
        }
      }

      // Submit to secure RPC function
      const { data, error } = await supabase.rpc('submit_quiz_answers', {
        p_answers: answersToSubmit,
      });

      if (error) throw error;

      // Parse results from server
      const serverResult = data as {
        total_questions: number;
        correct_answers: number;
        wrong_answers: number;
        percentage: number;
        details: Array<{
          question_id: string;
          selected_answer: string;
          correct_option: string;
          explanation: string | null;
          is_correct: boolean;
        }>;
      };

      // Store revealed answers for display
      const revealed: Record<string, { correctOption: string; explanation?: string }> = {};
      const details: { questionId: string; userAnswer: string | null; correctAnswer: string; isCorrect: boolean }[] = [];
      
      for (const detail of serverResult.details) {
        revealed[detail.question_id] = {
          correctOption: detail.correct_option,
          explanation: detail.explanation || undefined,
        };
        details.push({
          questionId: detail.question_id,
          userAnswer: detail.selected_answer,
          correctAnswer: detail.correct_option,
          isCorrect: detail.is_correct,
        });
      }

      setRevealedAnswers(revealed);

      const quizResult: QuizResult = {
        totalQuestions: serverResult.total_questions,
        correctAnswers: serverResult.correct_answers,
        wrongAnswers: serverResult.wrong_answers,
        score: serverResult.correct_answers,
        percentage: serverResult.percentage,
        details,
      };

      setResult(quizResult);
      setIsSubmitted(true);
      
      // Scroll to top để xem kết quả
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý làm lại bài
  const handleRetry = () => {
    setAnswers({});
    setSubAnswers({});
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

  // Tính tổng số câu đã trả lời (bao gồm câu con)
  const answeredCount = Object.keys(answers).length + Object.keys(subAnswers).length;
  
  // Tính tổng số câu hỏi thực tế (bao gồm câu con)
  const totalQuestionCount = questions.reduce((total, q) => {
    if (q.subQuestions && q.subQuestions.length > 0) {
      return total + q.subQuestions.length;
    }
    return total + 1;
  }, 0);
  const questionIds = questions.map((q) => q.id);
  
  // Back URL
  const backUrl = `/subjects/${subjectSlug}/${levelSlug}/${sectionSlug}`;

  // Title
  const pageTitle = `${section.name} - ${questionCount} câu`;

  // Questions already have correct format from useRandomQuestions
  const mappedQuestions = questions;

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
              
              // Merge revealed answers into question for display after submission
              const questionWithAnswers: Question = isSubmitted ? {
                ...question,
                correctOption: revealedAnswers[question.id]?.correctOption as 'A' | 'B' | 'C' | 'D',
                explanation: revealedAnswers[question.id]?.explanation,
                subQuestions: question.subQuestions?.map(subQ => ({
                  ...subQ,
                  correctOption: revealedAnswers[subQ.id]?.correctOption as 'A' | 'B' | 'C' | 'D',
                  explanation: revealedAnswers[subQ.id]?.explanation,
                })),
              } : question;
              
              return (
                <div
                  key={question.id}
                  ref={(el) => (questionRefs.current[index] = el)}
                >
                  <QuestionCard
                    question={questionWithAnswers}
                    questionNumber={index + 1}
                    selectedAnswer={answers[question.id] || null}
                    onSelectAnswer={(answer) =>
                      handleSelectAnswer(question.id, answer)
                    }
                    showResult={isSubmitted}
                    isSubmitted={isSubmitted || isSubmitting}
                    historyStats={stats}
                    subAnswers={subAnswers}
                    onSelectSubAnswer={handleSelectSubAnswer}
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
                  disabled={answeredCount === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {isSubmitting ? 'Đang nộp...' : `Nộp bài (${answeredCount}/${totalQuestionCount} câu)`}
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar - Progress & Submit */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <QuizProgress
                totalQuestions={totalQuestionCount}
                answeredQuestions={answeredCount}
                answers={{...answers, ...subAnswers}}
                questionIds={questionIds}
                onQuestionClick={scrollToQuestion}
              />

              {!isSubmitted && questions.length > 0 && (
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="w-full gap-2"
                  disabled={answeredCount === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                </Button>
              )}

              {!isSubmitted && answeredCount < totalQuestionCount && (
                <p className="text-center text-sm text-muted-foreground">
                  Bạn còn {totalQuestionCount - answeredCount} câu chưa trả lời
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
