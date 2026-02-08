/**
 * ListeningExamView - Hardcore exam mode for 聴解
 * 
 * Features:
 * - Start overlay: questions hidden until user starts
 * - Single audio plays without controls (no seeking/pausing)
 * - Mondai pagination with page-flip animation
 * - After submission: full audio controls for replay
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Headphones, Play, ChevronLeft, ChevronRight, Send, 
  Loader2, Volume2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { ResultSummary } from '@/components/quiz/ResultSummary';
import { cn } from '@/lib/utils';
import type { Question, ListeningExam } from '@/hooks/useQuestions';
import type { QuizResult } from '@/data/quizData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MondaiGroup {
  mondaiIndex: number;
  mondaiTitle: string;
  questions: Question[];
}

interface ListeningExamViewProps {
  exam: ListeningExam;
  examName: string;
  onRetry: () => void;
}

/** Group questions by mondaiIndex */
function groupByMondai(questions: Question[]): MondaiGroup[] {
  const groups = new Map<number, MondaiGroup>();
  
  for (const q of questions) {
    const idx = q.mondaiIndex ?? 0;
    if (!groups.has(idx)) {
      groups.set(idx, {
        mondaiIndex: idx,
        mondaiTitle: q.mondaiTitle || `問題${idx}`,
        questions: [],
      });
    }
    groups.get(idx)!.questions.push(q);
  }
  
  // Sort by mondaiIndex
  return Array.from(groups.values()).sort((a, b) => a.mondaiIndex - b.mondaiIndex);
}

export function ListeningExamView({ exam, examName, onRetry }: ListeningExamViewProps) {
  const [phase, setPhase] = useState<'ready' | 'exam' | 'result'>('ready');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [subAnswers, setSubAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, { correctOption: string; explanation?: string }>>({});
  
  // Mondai pagination
  const [currentMondaiPage, setCurrentMondaiPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  
  // Audio refs
  const examAudioRef = useRef<HTMLAudioElement>(null);
  const [audioStarted, setAudioStarted] = useState(false);

  // Group questions by mondai
  const mondaiPages = useMemo(() => groupByMondai(exam.questions), [exam.questions]);

  const totalPages = mondaiPages.length;
  const currentPage = mondaiPages[currentMondaiPage];

  // Total answerable questions count
  const totalQuestionCount = useMemo(() => {
    return exam.questions.reduce((total, q) => {
      if (q.subQuestions && q.subQuestions.length > 0) {
        return total + q.subQuestions.length;
      }
      return total + 1;
    }, 0);
  }, [exam.questions]);

  const answeredCount = Object.keys(answers).length + Object.keys(subAnswers).length;

  // Start exam
  const handleStart = useCallback(() => {
    setPhase('exam');
    // Start audio playback (no controls)
    setTimeout(() => {
      if (examAudioRef.current) {
        examAudioRef.current.play().catch(() => {
          // Autoplay might be blocked, that's okay
          toast.info('Nhấn vào nút phát để bắt đầu nghe audio');
        });
        setAudioStarted(true);
      }
    }, 300);
  }, []);

  // Navigate mondai pages
  const goToPage = useCallback((page: number) => {
    if (page < 0 || page >= totalPages) return;
    setFlipDirection(page > currentMondaiPage ? 'next' : 'prev');
    setCurrentMondaiPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentMondaiPage, totalPages]);

  // Clear flip animation after it plays
  useEffect(() => {
    if (flipDirection) {
      const timer = setTimeout(() => setFlipDirection(null), 400);
      return () => clearTimeout(timer);
    }
  }, [flipDirection, currentMondaiPage]);

  // Handle answer selection
  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (phase === 'result') return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSelectSubAnswer = (subQuestionId: string, answer: string) => {
    if (phase === 'result') return;
    setSubAnswers(prev => ({ ...prev, [subQuestionId]: answer }));
  };

  // Submit
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Stop audio
      if (examAudioRef.current) {
        examAudioRef.current.pause();
        examAudioRef.current.currentTime = 0;
      }

      const answersToSubmit: { question_id: string; selected_answer: string }[] = [];
      
      for (const q of exam.questions) {
        if (q.subQuestions && q.subQuestions.length > 0) {
          for (const subQ of q.subQuestions) {
            if (subAnswers[subQ.id]) {
              answersToSubmit.push({ question_id: subQ.id, selected_answer: subAnswers[subQ.id] });
            }
          }
        } else {
          if (answers[q.id]) {
            answersToSubmit.push({ question_id: q.id, selected_answer: answers[q.id] });
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
      
      // Use totalQuestionCount for accurate percentage (not just submitted count)
      const correctCount = serverResult.correct_answers;
      const wrongCount = totalQuestionCount - correctCount;
      const percentage = Math.round((correctCount / totalQuestionCount) * 100);
      
      setResult({
        totalQuestions: totalQuestionCount,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        score: correctCount,
        percentage,
        details,
      });
      setPhase('result');
      setCurrentMondaiPage(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryExam = () => {
    setPhase('ready');
    setAnswers({});
    setSubAnswers({});
    setResult(null);
    setRevealedAnswers({});
    setCurrentMondaiPage(0);
    setAudioStarted(false);
    onRetry();
  };

  // ============ READY PHASE ============
  if (phase === 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-8 shadow-card text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Headphones className="h-10 w-10 text-primary" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{examName}</h2>
            <p className="text-muted-foreground">
              {totalQuestionCount} câu hỏi • Đề nghe hoàn chỉnh
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4 text-left space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p className="text-sm text-foreground/80">
                Audio sẽ tự động phát khi bắt đầu và <strong>không thể tua lại</strong> trong quá trình làm bài.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p className="text-sm text-foreground/80">
                Sau khi nộp bài, bạn có thể nghe lại audio với đầy đủ điều khiển.
              </p>
            </div>
          </div>

          <Button size="lg" className="w-full gap-3 text-lg h-14" onClick={handleStart}>
            <Play className="h-6 w-6" />
            Bắt đầu làm bài
          </Button>
        </div>
      </div>
    );
  }

  // Build questions with revealed answers for result phase, and strip audio_url
  const getDisplayQuestion = (q: Question): Question => {
    const base: Question = { ...q, audio_url: undefined }; // Don't show per-question audio
    if (phase !== 'result') return base;
    return {
      ...base,
      correctOption: revealedAnswers[q.id]?.correctOption as 'A' | 'B' | 'C' | 'D',
      explanation: revealedAnswers[q.id]?.explanation,
      subQuestions: q.subQuestions?.map(subQ => ({
        ...subQ,
        audio_url: undefined,
        correctOption: revealedAnswers[subQ.id]?.correctOption as 'A' | 'B' | 'C' | 'D',
        explanation: revealedAnswers[subQ.id]?.explanation,
      })),
    };
  };

  // ============ EXAM / RESULT PHASE ============
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden audio element (no controls during exam) */}
      <audio
        ref={examAudioRef}
        src={exam.audioUrl}
        preload="auto"
      />

      {/* Audio status bar during exam */}
      {phase === 'exam' && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary animate-pulse">
              <Volume2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                🎧 Audio đang phát — Không thể tua lại
              </p>
              <p className="text-xs text-muted-foreground">
                Hãy tập trung nghe và chọn đáp án cho từng câu hỏi
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Result summary */}
      {phase === 'result' && result && (
        <ResultSummary
          result={result}
          examName={examName}
          onRetry={handleRetryExam}
        />
      )}

      {/* Audio player with full controls AFTER submission - below result */}
      {phase === 'result' && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">Nghe lại audio</span>
            <span className="text-xs text-muted-foreground">— Có thể tua và phát lại tự do</span>
          </div>
          <audio
            src={exam.audioUrl}
            controls
            className="w-full h-10"
          />
        </div>
      )}

      {/* Removed duplicate ResultSummary - now above audio player */}

      {phase === 'result' && (
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Chi tiết bài làm</h2>
          <span className="text-muted-foreground">(Xem lại đáp án đúng và sai)</span>
        </div>
      )}

      {/* Mondai page navigation */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentMondaiPage === 0}
          onClick={() => goToPage(currentMondaiPage - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </Button>
        
        <div className="flex items-center gap-2 overflow-x-auto px-2">
          {mondaiPages.map((page, idx) => {
            const isPageAnswered = page.questions.every(q => {
              if (q.subQuestions && q.subQuestions.length > 0) {
                return q.subQuestions.every(sq => !!subAnswers[sq.id]);
              }
              return !!answers[q.id];
            });

            return (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                  idx === currentMondaiPage
                    ? 'bg-primary text-primary-foreground scale-105'
                    : isPageAnswered
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
              >
                {page.mondaiTitle}
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={currentMondaiPage >= totalPages - 1}
          onClick={() => goToPage(currentMondaiPage + 1)}
          className="gap-1"
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Current page content with flip animation */}
      <div
        key={currentMondaiPage}
        className={cn(
          'transition-all duration-300',
          flipDirection === 'next' && 'animate-slide-in-from-right',
          flipDirection === 'prev' && 'animate-slide-in-from-left',
          !flipDirection && 'animate-fade-in'
        )}
      >
        {/* Mondai title header */}
        {currentPage && (
          <div className="mb-4 rounded-xl border border-border bg-muted/30 px-5 py-3">
            <h3 className="text-lg font-bold text-foreground">
              {currentPage.mondaiTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              {currentPage.questions.length} câu hỏi
            </p>
          </div>
        )}

        {currentPage && currentPage.questions.map((question, qIdx) => (
          <div key={question.id} className="mb-4">
            <QuestionCard
              question={getDisplayQuestion(question)}
              questionNumber={qIdx + 1}
              selectedAnswer={answers[question.id] || null}
              onSelectAnswer={(answer) => handleSelectAnswer(question.id, answer)}
              showResult={phase === 'result'}
              isSubmitted={phase === 'result' || isSubmitting}
              subAnswers={subAnswers}
              onSelectSubAnswer={handleSelectSubAnswer}
            />
          </div>
        ))}
      </div>

      {/* Navigation + Submit buttons at bottom */}
      {phase === 'exam' && (
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={currentMondaiPage === 0}
            onClick={() => goToPage(currentMondaiPage - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Trang trước
          </Button>

          {currentMondaiPage < totalPages - 1 ? (
            <Button
              onClick={() => goToPage(currentMondaiPage + 1)}
              className="gap-1"
            >
              Trang sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={answeredCount < totalQuestionCount || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSubmitting ? 'Đang nộp...' : `Nộp bài (${answeredCount}/${totalQuestionCount})`}
            </Button>
          )}
        </div>
      )}

      {/* Floating submit button visible on all pages */}
      {phase === 'exam' && answeredCount === totalQuestionCount && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="gap-2 shadow-lg rounded-full"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Nộp bài
          </Button>
        </div>
      )}
    </div>
  );
}
