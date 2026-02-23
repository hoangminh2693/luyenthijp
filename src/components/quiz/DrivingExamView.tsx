/**
 * DrivingExamView - Giao diện làm bài thi lái xe tại Nhật
 * Layout: Container viền mỏng, nền vàng nhạt
 * - Lưới số câu để điều hướng
 * - Khung trắng hiển thị câu hỏi
 * - 2 nút O (Đúng) và X (Sai)
 * - Auto-next sau khi chọn đáp án
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, XCircle, Lock, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Question } from '@/hooks/useQuestions';

interface DrivingAnswer {
  questionId: string;
  answer: 'A' | 'B'; // A = O (Đúng), B = X (Sai)
}

interface DrivingResult {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  details: Array<{
    questionId: string;
    selectedAnswer: string;
    correctOption: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
}

interface DrivingExamViewProps {
  questions: Question[];
  examName: string;
  onRetry: () => void;
}

export function DrivingExamView({ questions, examName, onRetry }: DrivingExamViewProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B'>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DrivingResult | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, { correctOption: string; explanation?: string }>>({});
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoNextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = questions[currentIndex];
  
  // Flatten for counting: questions with sub-questions count each sub as a unit
  const flatQuestionIds = useMemo(() => {
    const ids: string[] = [];
    for (const q of questions) {
      if (q.subQuestions && q.subQuestions.length > 0) {
        for (const sq of q.subQuestions) ids.push(sq.id);
      } else {
        ids.push(q.id);
      }
    }
    return ids;
  }, [questions]);
  
  const answeredCount = flatQuestionIds.filter(id => !!answers[id]).length;
  const totalQuestions = flatQuestionIds.length;

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
    };
  }, []);

  const handleSelectAnswer = (questionId: string, answer: 'A' | 'B') => {
    if (isSubmitted) return;
    
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    
    // Auto-next: only for questions without sub-questions
    const hasSubQ = currentQuestion?.subQuestions && currentQuestion.subQuestions.length > 0;
    if (!hasSubQ) {
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
      autoNextTimer.current = setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      }, 400);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const answersToSubmit = flatQuestionIds.map(qId => ({
        question_id: qId,
        selected_answer: answers[qId] || 'A',
      }));

      // Use different RPC based on auth status
      const rpcName = user ? 'submit_quiz_answers' : 'check_quiz_answers';
      const { data, error } = await supabase.rpc(rpcName, {
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
      const details: DrivingResult['details'] = [];

      for (const detail of serverResult.details) {
        revealed[detail.question_id] = {
          correctOption: detail.correct_option,
          explanation: detail.explanation || undefined,
        };
        details.push({
          questionId: detail.question_id,
          selectedAnswer: detail.selected_answer,
          correctOption: detail.correct_option,
          isCorrect: detail.is_correct,
          explanation: detail.explanation || undefined,
        });
      }

      setRevealedAnswers(revealed);
      setResult({
        totalQuestions: serverResult.total_questions,
        correctAnswers: serverResult.correct_answers,
        wrongAnswers: serverResult.wrong_answers,
        percentage: serverResult.percentage,
        details,
      });
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error submitting:', err);
      toast.error('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setIsSubmitted(false);
    setResult(null);
    setRevealedAnswers({});
    setCurrentIndex(0);
    onRetry();
  };

  // ===== RESULT SCREEN =====
  if (isSubmitted && result) {
    const passed = result.correctAnswers >= Math.ceil(result.totalQuestions * 0.9); // 90% pass rate for driving test
    
    return (
      <div className="space-y-6">
        {/* Result summary */}
        <div
          className="rounded-2xl border-2 p-8 text-center"
          style={{
            backgroundColor: passed ? '#f0fdf4' : '#fff1f2',
            borderColor: passed ? '#86efac' : '#fda4af',
          }}
        >
          <div className="text-6xl mb-4">{passed ? '🎉' : '😢'}</div>
          <h2 className="text-3xl font-bold mb-2" style={{ color: passed ? '#15803d' : '#be123c' }}>
            {passed ? 'Chúc mừng! Đậu rồi!' : 'Chưa đạt. Cố lên!'}
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Điểm số: <span className="font-bold text-2xl">{result.correctAnswers}/{result.totalQuestions}</span> câu đúng ({result.percentage}%)
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Thi lái xe cần đạt ít nhất 90% ({Math.ceil(result.totalQuestions * 0.9)} câu)
          </p>
          <Button onClick={handleRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Làm lại
          </Button>
        </div>

        {/* Detailed review */}
        <h3 className="text-xl font-bold text-foreground">Xem lại đáp án</h3>
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const hasSubQ = q.subQuestions && q.subQuestions.length > 0;
            const itemsToReview = hasSubQ ? q.subQuestions! : [q];
            
            return (
              <div key={q.id} className="space-y-2">
                {/* Parent question content (shown as context for sub-questions) */}
                {hasSubQ && (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-sm font-medium text-foreground" dangerouslySetInnerHTML={{ __html: q.content }} />
                    {q.image_url && (
                      <img src={q.image_url} alt="" className="mt-2 max-h-40 object-contain rounded-lg" />
                    )}
                  </div>
                )}
                {itemsToReview.map((item, subIdx) => {
                  const detail = result.details.find(d => d.questionId === item.id);
                  const userAnswer = answers[item.id];
                  const isCorrect = detail?.isCorrect ?? false;
                  const correctOption = detail?.correctOption || 'A';
                  const displayNum = hasSubQ ? `${idx + 1}-${subIdx + 1}` : `${idx + 1}`;
                  
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border-2 p-4"
                      style={{
                        borderColor: isCorrect ? '#86efac' : '#fda4af',
                        backgroundColor: isCorrect ? '#f0fdf4' : '#fff1f2',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: isCorrect ? '#22c55e' : '#ef4444' }}>
                          {displayNum}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground mb-2"
                            dangerouslySetInnerHTML={{ __html: item.content }} />
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground">Bạn chọn:</span>
                              <span
                                className="font-bold text-base"
                                style={{ color: userAnswer === 'A' ? '#2563eb' : '#dc2626' }}
                              >
                                {userAnswer === 'A' ? '○' : userAnswer === 'B' ? '✕' : '—'}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground">Đáp án:</span>
                              <span
                                className="font-bold text-base"
                                style={{ color: correctOption === 'A' ? '#2563eb' : '#dc2626' }}
                              >
                                {correctOption === 'A' ? '○' : '✕'}
                              </span>
                            </span>
                            {isCorrect
                              ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                              : <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                            }
                          </div>
                          {detail?.explanation && (
                            user ? (
                              <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
                                <div className="flex items-start gap-1.5">
                                  <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                                  <p className="text-xs text-foreground/80"
                                    dangerouslySetInnerHTML={{ __html: detail.explanation }} />
                                </div>
                              </div>
                            ) : (
                              <div className="relative mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
                                <p className="text-xs text-foreground/80 select-none filter blur-sm"
                                  dangerouslySetInnerHTML={{ __html: detail.explanation }}
                                  aria-hidden="true" />
                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
                                  <Link to="/auth" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                                    <Lock className="h-3 w-3" />
                                    Đăng nhập để xem giải thích
                                  </Link>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== EXAM SCREEN =====
  if (!currentQuestion) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Không có câu hỏi nào.
      </div>
    );
  }

  const hasSubQ = currentQuestion.subQuestions && currentQuestion.subQuestions.length > 0;

  return (
    <div
      className="rounded-2xl border border-border p-4 md:p-6 space-y-4"
      style={{ backgroundColor: '#fefce8', borderColor: '#fde68a' }}
    >
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Câu <span className="text-foreground font-bold">{currentIndex + 1}</span> / {questions.length}
        </span>
        <Badge variant="outline" className="text-xs">
          {answeredCount}/{totalQuestions} đã trả lời
        </Badge>
      </div>

      {/* Question number grid */}
      <div
        className="rounded-xl border p-3"
        style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a' }}
      >
        <p className="text-xs text-muted-foreground mb-2 font-medium">Điều hướng câu hỏi:</p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, idx) => {
            const isActive = idx === currentIndex;
            const qHasSub = q.subQuestions && q.subQuestions.length > 0;
            const answered = qHasSub
              ? q.subQuestions!.every(sq => !!answers[sq.id])
              : !!answers[q.id];
            const partialAnswered = qHasSub
              ? q.subQuestions!.some(sq => !!answers[sq.id]) && !answered
              : false;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className="w-8 h-8 rounded-md text-xs font-bold transition-all duration-150 flex items-center justify-center"
                style={{
                  backgroundColor: isActive
                    ? '#1d4ed8'
                    : answered
                    ? '#22c55e'
                    : partialAnswered
                    ? '#facc15'
                    : '#ffffff',
                  color: isActive || answered ? '#ffffff' : partialAnswered ? '#713f12' : '#374151',
                  border: isActive
                    ? '2px solid #1d4ed8'
                    : answered
                    ? '2px solid #22c55e'
                    : partialAnswered
                    ? '2px solid #facc15'
                    : '1px solid #d1d5db',
                  boxShadow: isActive ? '0 0 0 2px rgba(29,78,216,0.3)' : undefined,
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div
        className="rounded-xl border-2 p-5 min-h-[200px] flex flex-col justify-center"
        style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
      >
        <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
          Câu hỏi {currentIndex + 1}
        </p>
        <div
          className="text-base md:text-lg font-medium text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
        />
        {currentQuestion.image_url && (
          <img
            src={currentQuestion.image_url}
            alt="Question illustration"
            className="mt-4 max-h-64 object-contain rounded-lg mx-auto"
          />
        )}
      </div>

      {/* O/X Buttons - different rendering for sub-questions */}
      {hasSubQ ? (
        <div className="space-y-3">
          {currentQuestion.subQuestions!.map((sq, sqIdx) => {
            const sqAnswer = answers[sq.id];
            return (
              <div key={sq.id} className="rounded-xl border border-border bg-white p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Câu con {sqIdx + 1}</p>
                <div className="text-sm font-medium text-foreground" dangerouslySetInnerHTML={{ __html: sq.content }} />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSelectAnswer(sq.id, 'A')}
                    disabled={isSubmitted}
                    className="relative h-14 rounded-xl border-2 font-black text-2xl transition-all duration-150 disabled:opacity-50"
                    style={{
                      backgroundColor: sqAnswer === 'A' ? '#dbeafe' : '#f3f4f6',
                      borderColor: sqAnswer === 'A' ? '#2563eb' : '#d1d5db',
                      color: sqAnswer === 'A' ? '#1d4ed8' : '#6b7280',
                      transform: sqAnswer === 'A' ? 'scale(1.02)' : undefined,
                    }}
                  >
                    ○
                  </button>
                  <button
                    onClick={() => handleSelectAnswer(sq.id, 'B')}
                    disabled={isSubmitted}
                    className="relative h-14 rounded-xl border-2 font-black text-2xl transition-all duration-150 disabled:opacity-50"
                    style={{
                      backgroundColor: sqAnswer === 'B' ? '#fee2e2' : '#f3f4f6',
                      borderColor: sqAnswer === 'B' ? '#dc2626' : '#d1d5db',
                      color: sqAnswer === 'B' ? '#dc2626' : '#6b7280',
                      transform: sqAnswer === 'B' ? 'scale(1.02)' : undefined,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* O Button - Đúng */}
          <button
            onClick={() => handleSelectAnswer(currentQuestion.id, 'A')}
            disabled={isSubmitted}
            className="group relative h-20 md:h-24 rounded-2xl border-2 font-black text-4xl md:text-5xl transition-all duration-150 disabled:opacity-50"
            style={{
              backgroundColor: answers[currentQuestion.id] === 'A' ? '#dbeafe' : '#f3f4f6',
              borderColor: answers[currentQuestion.id] === 'A' ? '#2563eb' : '#d1d5db',
              color: answers[currentQuestion.id] === 'A' ? '#1d4ed8' : '#6b7280',
              transform: answers[currentQuestion.id] === 'A' ? 'scale(1.02)' : undefined,
              boxShadow: answers[currentQuestion.id] === 'A' ? '0 4px 12px rgba(37,99,235,0.3)' : undefined,
            }}
          >
            <span className="select-none">○</span>
            <span
              className="absolute bottom-2 left-0 right-0 text-xs font-medium text-center"
              style={{ color: answers[currentQuestion.id] === 'A' ? '#1d4ed8' : '#9ca3af' }}
            >
              Đúng (O)
            </span>
          </button>

          {/* X Button - Sai */}
          <button
            onClick={() => handleSelectAnswer(currentQuestion.id, 'B')}
            disabled={isSubmitted}
            className="group relative h-20 md:h-24 rounded-2xl border-2 font-black text-4xl md:text-5xl transition-all duration-150 disabled:opacity-50"
            style={{
              backgroundColor: answers[currentQuestion.id] === 'B' ? '#fee2e2' : '#f3f4f6',
              borderColor: answers[currentQuestion.id] === 'B' ? '#dc2626' : '#d1d5db',
              color: answers[currentQuestion.id] === 'B' ? '#dc2626' : '#6b7280',
              transform: answers[currentQuestion.id] === 'B' ? 'scale(1.02)' : undefined,
              boxShadow: answers[currentQuestion.id] === 'B' ? '0 4px 12px rgba(220,38,38,0.3)' : undefined,
            }}
          >
            <span className="select-none">✕</span>
            <span
              className="absolute bottom-2 left-0 right-0 text-xs font-medium text-center"
              style={{ color: answers[currentQuestion.id] === 'B' ? '#dc2626' : '#9ca3af' }}
            >
              Sai (X)
            </span>
          </button>
        </div>
      )}

      {/* Navigation + Submit */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Trước
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="gap-1 ml-auto"
          >
            Tiếp
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            size="sm"
            disabled={answeredCount === 0 || isSubmitting}
            className="gap-1 ml-auto"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? 'Đang nộp...' : `Nộp bài (${answeredCount}/${totalQuestions})`}
          </Button>
        )}
      </div>

      {/* Submit button - if all answered */}
      {answeredCount === totalQuestions && !isSubmitted && (
        <div className="pt-2 border-t border-yellow-200">
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={isSubmitting}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {isSubmitting ? 'Đang nộp...' : `Nộp bài - ${totalQuestions} câu đã trả lời`}
          </Button>
        </div>
      )}
    </div>
  );
}
