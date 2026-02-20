import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, Navigate, Link, useSearchParams } from 'react-router-dom';
import { useRobotsMeta } from '@/hooks/useRobotsMeta';
import { ArrowLeft, Send, Loader2, Headphones, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { ResultSummary } from '@/components/quiz/ResultSummary';
import { ListeningExamView } from '@/components/quiz/ListeningExamView';
import { DrivingExamView } from '@/components/quiz/DrivingExamView';
import { Breadcrumb } from '@/components/layout/Header';
import { useQuestionHistory } from '@/hooks/useQuestionHistory';
import { useLeafCategory } from '@/hooks/useCategoryPath';
import { useRandomQuestions, useRandomListeningExam, type Question } from '@/hooks/useQuestions';
import { type QuizResult } from '@/data/quizData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

/**
 * QuizPage - Trang làm bài thi
 * 
 * URL: /quiz/:subjectSlug/*?count=N hoặc ?mode=listening
 * VD: /quiz/jlpt/n5/moji-goi?count=10
 * 
 * SECURE: Correct answers are only revealed after server-side submission
 */
const QuizPage = () => {
  useRobotsMeta('noindex, nofollow');
  const { subjectSlug, '*': wildcardPath } = useParams<{ 
    subjectSlug?: string;
    '*': string;
  }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isListeningMode = mode === 'listening';
  const questionCount = parseInt(searchParams.get('count') || '10', 10);
  
  // Parse category path
  const categoryPath = wildcardPath || '';
  
  // State quản lý bài thi
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [subAnswers, setSubAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, { correctOption: string; explanation?: string }>>({});
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // Question history hook
  const { getQuestionStats } = useQuestionHistory();
  
  // Unique session ID - changes on each mount to ensure fresh questions
  const [sessionId] = useState(() => crypto.randomUUID());

  // Fetch category data
  const { 
    subject, 
    categories, 
    leafCategory, 
    isLoading: loadingPath 
  } = useLeafCategory(subjectSlug, categoryPath);
  
  // Tìm section_id matching để fetch questions (trong giai đoạn chuyển đổi)
  // Cần match cả subject_id (qua levels) + root category slug/name để tránh trộn môn / cấp
  const rootCategory = categories.length > 0 ? categories[0] : null; // Category gốc (VD: N5, N2)
  
  const { data: matchingSection } = useQuery({
    queryKey: ['matching-section-for-quiz', subject?.id, leafCategory?.slug, rootCategory?.slug, rootCategory?.name],
    queryFn: async () => {
      if (!leafCategory || !subject) return null;
      
      // Bước 1: Tìm level thuộc subject và match với root category (VD: N2, N5)
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
      // Nếu không tìm thấy level match, không nên fallback tìm section bất kỳ
      // vì có thể trộn lẫn với section cùng slug của subject khác
      if (!levelId) return null;
      
      const { data } = await supabase
        .from('sections')
        .select('id, level_id')
        .eq('slug', leafCategory.slug)
        .eq('level_id', levelId)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!leafCategory && !!subject,
  });
  
  const sectionId = matchingSection?.id;
  
  // Always pass categoryId alongside sectionId — questions may be in either
  const categoryIdForQuiz = leafCategory?.id;
  
  // Determine if questions should be shuffled
  const shouldShuffle = !leafCategory?.fixed_exam_mode;
  
  // Fetch câu hỏi dựa theo mode
  const { data: randomQuestions = [], isLoading: loadingRandomQuestions } = useRandomQuestions(
    !isListeningMode ? sectionId : undefined, 
    questionCount,
    sessionId,
    !isListeningMode ? categoryIdForQuiz : undefined,
    shouldShuffle
  );
  const { data: listeningExam, isLoading: loadingListeningExam } = useRandomListeningExam(
    isListeningMode ? sectionId : undefined,
    isListeningMode,
    sessionId,
    isListeningMode ? categoryIdForQuiz : undefined
  );
  
  // Chọn questions dựa theo mode
  const questions = useMemo(() => {
    if (isListeningMode && listeningExam) {
      return listeningExam.questions;
    }
    return randomQuestions;
  }, [isListeningMode, listeningExam, randomQuestions]);

  // Scroll to top khi component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [categoryPath]);

  const isLoading = loadingPath || 
    (isListeningMode ? loadingListeningExam : loadingRandomQuestions);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Nếu không tìm thấy dữ liệu
  if (!subject || !leafCategory) {
    return <Navigate to="/subjects" replace />;
  }

  // Xử lý chọn đáp án
  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSelectSubAnswer = (subQuestionId: string, answer: string) => {
    if (isSubmitted) return;
    setSubAnswers((prev) => ({ ...prev, [subQuestionId]: answer }));
  };

  // Xử lý nộp bài - SECURE: Submit to server for validation
  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const answersToSubmit: { question_id: string; selected_answer: string }[] = [];
      
      for (const q of questions) {
        if (q.subQuestions && q.subQuestions.length > 0) {
          for (const subQ of q.subQuestions) {
            if (subAnswers[subQ.id]) {
              answersToSubmit.push({
                question_id: subQ.id,
                selected_answer: subAnswers[subQ.id],
              });
            }
          }
        } else {
          if (answers[q.id]) {
            answersToSubmit.push({
              question_id: q.id,
              selected_answer: answers[q.id],
            });
          }
        }
      }

      const { data, error } = await supabase.rpc('submit_quiz_answers', {
        p_answers: answersToSubmit,
      });

      if (error) throw error;

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubAnswers({});
    setIsSubmitted(false);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToQuestion = (index: number) => {
    questionRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const answeredCount = Object.keys(answers).length + Object.keys(subAnswers).length;
  
  const totalQuestionCount = questions.reduce((total, q) => {
    if (q.subQuestions && q.subQuestions.length > 0) {
      return total + q.subQuestions.length;
    }
    return total + 1;
  }, 0);
  const questionIds = questions.map((q) => q.id);
  
  // Build URLs
  const backUrl = `/subjects/${subjectSlug}/${categoryPath}`;
  const pageTitle = isListeningMode 
    ? `${leafCategory.name} - Đề nghe` 
    : `${leafCategory.name} - ${questionCount} câu`;

  // Audio toggle
  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  // Build breadcrumb
  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: 'Chọn môn học', href: '/subjects' },
    { label: subject.name, href: `/subjects/${subject.slug}` },
  ];
  
  let pathSoFar = '';
  categories.forEach((cat) => {
    pathSoFar = pathSoFar ? `${pathSoFar}/${cat.slug}` : cat.slug;
    breadcrumbItems.push({
      label: cat.name,
      href: `/subjects/${subject.slug}/${pathSoFar}`,
    });
  });
  breadcrumbItems.push({ label: isListeningMode ? 'Làm đề nghe' : 'Làm bài' });

  const mappedQuestions = questions;

  // ======= DRIVING MODE: Use DrivingExamView for 'bang-lai-xe' subject =======
  if (subjectSlug === 'bang-lai-xe' && questions.length > 0) {
    return (
      <div className="min-h-screen bg-background pb-8">
        <div className="container py-8">
          <div className="mb-6">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div className="mb-6">
            <Link
              to={backUrl}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Link>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl mt-2">
              🚗 {pageTitle}
            </h1>
            <p className="text-muted-foreground">{totalQuestionCount} câu hỏi Đúng/Sai</p>
          </div>
          <DrivingExamView
            questions={questions}
            examName={pageTitle}
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  // ======= LISTENING MODE: Use dedicated ListeningExamView =======
  if (isListeningMode && listeningExam) {
    return (
      <div className="min-h-screen bg-background pb-8">
        <div className="container py-8">
          <div className="mb-6">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div className="mb-8">
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
          </div>
          <ListeningExamView
            exam={listeningExam}
            examName={pageTitle}
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  // ======= STANDARD MODE =======
  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
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
              {totalQuestionCount} câu hỏi
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Questions column */}
          <div className="space-y-6">
            {/* Result summary */}
            {isSubmitted && result && (
              <ResultSummary
                result={result}
                examName={pageTitle}
                onRetry={handleRetry}
              />
            )}

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

          {/* Sidebar */}
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
