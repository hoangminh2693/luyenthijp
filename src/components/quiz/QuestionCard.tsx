import { useState, useRef } from 'react';
import { Check, X, Lightbulb, Play, Pause, Volume2, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Question } from '@/hooks/useQuestions';
import { cn } from '@/lib/utils';
import { QuestionHistoryBadge } from './QuestionHistoryBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Ký hiệu số thứ tự kiểu Nhật
const OPTION_SYMBOLS: Record<string, string> = {
  A: '①',
  B: '②',
  C: '③',
  D: '④',
};

/**
 * QuestionCard Component - Hiển thị một câu hỏi trắc nghiệm
 * Hỗ trợ hình ảnh, âm thanh và câu hỏi con
 * Hỗ trợ nhiều loại câu hỏi: standard, audio_only, image_based
 */
interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  showResult?: boolean;
  isSubmitted?: boolean;
  historyStats?: {
    totalAttempts: number;
    correctCount: number;
  };
  // Cho câu hỏi con
  subAnswers?: Record<string, string>;
  onSelectSubAnswer?: (subQuestionId: string, answer: string) => void;
}

function AudioPlayer({ src, locked = false }: { src: string; locked?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  const togglePlay = () => {
    if (audioRef.current && !hasPlayed) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Locked mode: chỉ play 1 lần, không cho tua
  if (locked) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={togglePlay}
          disabled={hasPlayed}
          className="h-10 w-10 shrink-0"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <audio
          ref={audioRef}
          src={src}
          onEnded={() => { setIsPlaying(false); setHasPlayed(true); }}
          className="hidden"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>{hasPlayed ? 'Đã nghe (chỉ 1 lần)' : 'Nghe audio'}</span>
        </div>
      </div>
    );
  }

  // Unlocked mode: full controls
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <audio
        src={src}
        controls
        className="w-full h-8"
      />
    </div>
  );
}

// Component hiển thị option cho audio_only type (chỉ số thứ tự)
function AudioOnlyOptionButton({
  option,
  isSelected,
  isCorrect,
  showResult,
  isSubmitted,
  onClick,
}: {
  option: string;
  isSelected: boolean;
  isCorrect: boolean;
  showResult: boolean;
  isSubmitted: boolean;
  onClick: () => void;
}) {
  const getStyle = () => {
    if (!showResult) {
      return isSelected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5';
    }

    if (isCorrect) {
      return 'border-success bg-success text-success-foreground';
    }
    if (isSelected && !isCorrect) {
      return 'border-error bg-error text-error-foreground';
    }
    return 'border-border bg-card opacity-60';
  };

  return (
    <button
      onClick={onClick}
      disabled={isSubmitted}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-bold transition-all duration-200',
        getStyle(),
        !isSubmitted && 'cursor-pointer',
        isSubmitted && 'cursor-default'
      )}
    >
      {showResult && isCorrect ? (
        <Check className="h-5 w-5" />
      ) : showResult && isSelected && !isCorrect ? (
        <X className="h-5 w-5" />
      ) : (
        OPTION_SYMBOLS[option]
      )}
    </button>
  );
}

function OptionButton({
  option,
  text,
  isSelected,
  isCorrect,
  showResult,
  isSubmitted,
  onClick,
}: {
  option: string;
  text: string;
  isSelected: boolean;
  isCorrect: boolean;
  showResult: boolean;
  isSubmitted: boolean;
  onClick: () => void;
}) {
  const getOptionStyle = () => {
    if (!showResult) {
      return isSelected
        ? 'border-primary bg-primary/10 text-foreground'
        : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5';
    }

    if (isCorrect) {
      return 'border-success bg-success-light text-success';
    }
    if (isSelected && !isCorrect) {
      return 'border-error bg-error-light text-error';
    }
    return 'border-border bg-card opacity-60';
  };

  return (
    <button
      onClick={onClick}
      disabled={isSubmitted}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all duration-200',
        getOptionStyle(),
        !isSubmitted && 'cursor-pointer',
        isSubmitted && 'cursor-default'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
          showResult && isCorrect
            ? 'border-success bg-success text-success-foreground'
            : showResult && isSelected && !isCorrect
            ? 'border-error bg-error text-error-foreground'
            : isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background'
        )}
      >
        {showResult && isCorrect ? (
          <Check className="h-4 w-4" />
        ) : showResult && isSelected && !isCorrect ? (
          <X className="h-4 w-4" />
        ) : (
          OPTION_SYMBOLS[option] || option
        )}
      </span>

      <span 
        className="flex-1 text-sm"
        dangerouslySetInnerHTML={{ __html: text }}
      />

      {showResult && isCorrect && (
        <span className="text-xs font-medium text-success">Đáp án đúng</span>
      )}
      {showResult && isSelected && !isCorrect && (
        <span className="text-xs font-medium text-error">Đáp án sai</span>
      )}
    </button>
  );
}

// Component render options dựa vào loại câu hỏi
function QuestionOptions({
  question,
  selectedAnswer,
  showResult,
  isSubmitted,
  onSelect,
}: {
  question: Question;
  selectedAnswer: string | null;
  showResult: boolean;
  isSubmitted: boolean;
  onSelect: (answer: string) => void;
}) {
  const questionType = question.questionType || 'standard';
  const optionCount = question.optionCount || 4;
  
  // Tạo danh sách options dựa vào số lượng
  const optionKeys = (['A', 'B', 'C', 'D'] as const).slice(0, optionCount);

  // TYPE_B: audio_only - chỉ hiển thị số thứ tự
  if (questionType === 'audio_only') {
    return (
      <div className="flex flex-wrap gap-3 justify-center py-4">
        {optionKeys.map((option) => (
          <AudioOnlyOptionButton
            key={option}
            option={option}
            isSelected={selectedAnswer === option}
            isCorrect={showResult && option === question.correctOption}
            showResult={showResult && !!question.correctOption}
            isSubmitted={isSubmitted}
            onClick={() => !isSubmitted && onSelect(option)}
          />
        ))}
      </div>
    );
  }

  // standard / image_based - hiển thị đầy đủ text nếu có
  return (
    <div className="space-y-3">
      {optionKeys.map((option) => {
        const optionText = question.options[option];
        // Nếu không có text, hiển thị như audio_only
        if (!optionText || optionText.trim() === '') {
          return (
            <div key={option} className="flex justify-start">
              <AudioOnlyOptionButton
                option={option}
                isSelected={selectedAnswer === option}
                isCorrect={showResult && option === question.correctOption}
                showResult={showResult && !!question.correctOption}
                isSubmitted={isSubmitted}
                onClick={() => !isSubmitted && onSelect(option)}
              />
            </div>
          );
        }
        
        return (
          <OptionButton
            key={option}
            option={option}
            text={optionText}
            isSelected={selectedAnswer === option}
            isCorrect={showResult && option === question.correctOption}
            showResult={showResult && !!question.correctOption}
            isSubmitted={isSubmitted}
            onClick={() => !isSubmitted && onSelect(option)}
          />
        );
      })}
    </div>
  );
}

export function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
  isSubmitted = false,
  historyStats,
  subAnswers = {},
  onSelectSubAnswer,
}: QuestionCardProps) {
  const { user } = useAuth();
  const questionType = question.questionType || 'standard';
  const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
  
  // Với audio_only, không hiển thị nội dung câu hỏi (chỉ số thứ tự)
  const showQuestionContent = questionType !== 'audio_only' || question.content.trim() !== '';

  // Render explanation with blur for guests
  const renderExplanation = (explanation: string | undefined, isMain: boolean = true) => {
    if (!showResult || !explanation) return null;
    
    if (!user) {
      // Guest: blur explanation + login prompt
      return (
        <div className={cn("relative rounded-lg border border-primary/20 bg-primary/5", isMain ? "mt-4 p-4" : "mt-3 p-3")}>
          <div className="flex items-start gap-2">
            <Lightbulb className={cn("shrink-0 text-primary mt-0.5", isMain ? "h-5 w-5" : "h-4 w-4")} />
            <div className="flex-1">
              {isMain && <p className="font-medium text-primary mb-1">Giải thích</p>}
              <div 
                className={cn("text-foreground/80 leading-relaxed select-none filter blur-sm", isMain ? "text-sm" : "text-xs")}
                dangerouslySetInnerHTML={{ __html: explanation }}
                aria-hidden="true"
              />
            </div>
          </div>
          {/* Overlay with login prompt */}
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
            <Link to="/auth" className="flex flex-col items-center gap-2 text-center px-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Đăng nhập hoặc Đăng ký miễn phí
              </p>
              <p className="text-xs text-muted-foreground">
                để xem giải thích chi tiết
              </p>
              <Button size="sm" className="mt-1 gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Đăng nhập ngay
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    // Authenticated: show normally
    if (isMain) {
      return (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-primary mb-1">Giải thích</p>
              <div 
                className="text-sm text-foreground/80 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: explanation }}
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <div 
            className="text-xs text-foreground/80"
            dangerouslySetInnerHTML={{ __html: explanation }}
          />
        </div>
      </div>
    );
  };

  return (
    <div 
      className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in-up"
      style={{ animationDelay: `${questionNumber * 0.05}s` }}
    >
      {/* Question header */}
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {questionNumber}
        </span>
        <div className="flex-1">
          {showQuestionContent && question.content.trim() !== '' ? (
             <p 
               className="text-base font-normal text-foreground leading-relaxed [&_b]:font-bold [&_strong]:font-bold [&_b]:text-foreground [&_strong]:text-foreground"
               dangerouslySetInnerHTML={{ __html: question.content }}
             />
          ) : (
            <p className="text-base font-medium text-muted-foreground italic">
              Câu hỏi trong audio - Nghe và chọn đáp án
            </p>
          )}
          {historyStats && historyStats.totalAttempts > 0 && (
            <QuestionHistoryBadge
              totalAttempts={historyStats.totalAttempts}
              correctCount={historyStats.correctCount}
              className="mt-2"
            />
          )}
        </div>
      </div>

      {/* Media section */}
      <div className="pl-11 space-y-3">
        {question.image_url && (
          <div className="mb-4">
            <img 
              src={question.image_url} 
              alt={`Hình minh họa câu hỏi ${questionNumber}: ${question.content.replace(/<[^>]*>/g, '').slice(0, 80)}`}
              loading="lazy"
              className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl h-auto max-h-48 sm:max-h-64 md:max-h-80 rounded-lg object-contain border border-border mx-auto"
            />
          </div>
        )}

        {question.audio_url && (
          <div className="mb-4">
            <AudioPlayer src={question.audio_url} locked={!showResult} />
          </div>
        )}

        {/* Options - chỉ hiển thị nếu KHÔNG có câu hỏi con */}
        {!hasSubQuestions && (
          <QuestionOptions
            question={question}
            selectedAnswer={selectedAnswer}
            showResult={showResult}
            isSubmitted={isSubmitted}
            onSelect={onSelectAnswer}
          />
        )}

        {/* Sub-questions */}
        {hasSubQuestions && (
          <div className="space-y-6 mt-4">
            {question.subQuestions!.map((subQ, idx) => (
              <div key={subQ.id} className="rounded-lg border border-dashed border-border/60 p-4 bg-muted/10">
                {/* Sub-question header */}
                {subQ.questionType !== 'audio_only' && subQ.content.trim() !== '' ? (
                  <p 
                    className="mb-3 text-sm font-medium text-foreground"
                    dangerouslySetInnerHTML={{ __html: `${questionNumber}.${idx + 1}. ${subQ.content}` }}
                  />
                ) : (
                  <p className="mb-3 text-sm font-medium text-muted-foreground italic">
                    {questionNumber}.{idx + 1}. Nghe và chọn đáp án
                  </p>
                )}

                {/* Sub-question image */}
                {subQ.image_url && (
                  <div className="mb-3">
                    <img 
                      src={subQ.image_url} 
                      alt={`Hình minh họa câu ${questionNumber}.${idx + 1}: ${subQ.content.replace(/<[^>]*>/g, '').slice(0, 60)}`}
                      loading="lazy"
                      className="w-full max-w-sm h-auto max-h-48 rounded-lg object-contain border border-border mx-auto"
                    />
                  </div>
                )}

                {/* Sub-question options */}
                <QuestionOptions
                  question={subQ}
                  selectedAnswer={subAnswers[subQ.id] || null}
                  showResult={showResult}
                  isSubmitted={isSubmitted}
                  onSelect={(answer) => onSelectSubAnswer?.(subQ.id, answer)}
                />

                {/* Sub-question explanation */}
                {renderExplanation(subQ.explanation, false)}
              </div>
            ))}
          </div>
        )}

        {/* Main question explanation */}
        {!hasSubQuestions && renderExplanation(question.explanation, true)}
      </div>
    </div>
  );
}
