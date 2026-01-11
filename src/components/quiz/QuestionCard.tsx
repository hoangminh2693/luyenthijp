import { useState, useRef } from 'react';
import { Check, X, Lightbulb, Play, Pause, Volume2 } from 'lucide-react';
import type { Question } from '@/hooks/useQuestions';
import { cn } from '@/lib/utils';
import { QuestionHistoryBadge } from './QuestionHistoryBadge';
import { Button } from '@/components/ui/button';

/**
 * QuestionCard Component - Hiển thị một câu hỏi trắc nghiệm
 * Hỗ trợ hình ảnh, âm thanh và câu hỏi con
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

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={togglePlay}
        className="h-10 w-10 shrink-0"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>Nghe audio</span>
        </div>
        <audio
          src={src}
          controls
          className="mt-1 w-full h-8"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </div>
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
          option
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
  const options = ['A', 'B', 'C', 'D'] as const;
  const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;

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
          <p 
            className="text-base font-medium text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: question.content }}
          />
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
              alt="Question image" 
              className="max-h-64 rounded-lg object-contain border border-border"
            />
          </div>
        )}

        {question.audio_url && (
          <div className="mb-4">
            <AudioPlayer src={question.audio_url} />
          </div>
        )}

        {/* Options - chỉ hiển thị nếu KHÔNG có câu hỏi con */}
        {!hasSubQuestions && (
          <div className="space-y-3">
            {options.map((option) => (
              <OptionButton
                key={option}
                option={option}
                text={question.options[option]}
                isSelected={selectedAnswer === option}
                isCorrect={option === question.correctOption}
                showResult={showResult}
                isSubmitted={isSubmitted}
                onClick={() => !isSubmitted && onSelectAnswer(option)}
              />
            ))}
          </div>
        )}

        {/* Sub-questions */}
        {hasSubQuestions && (
          <div className="space-y-6 mt-4">
            {question.subQuestions!.map((subQ, idx) => (
              <div key={subQ.id} className="rounded-lg border border-dashed border-border/60 p-4 bg-muted/10">
                <p 
                  className="mb-3 text-sm font-medium text-foreground"
                  dangerouslySetInnerHTML={{ __html: `${questionNumber}.${idx + 1}. ${subQ.content}` }}
                />
                <div className="space-y-2">
                  {options.map((option) => (
                    <OptionButton
                      key={option}
                      option={option}
                      text={subQ.options[option]}
                      isSelected={subAnswers[subQ.id] === option}
                      isCorrect={option === subQ.correctOption}
                      showResult={showResult}
                      isSubmitted={isSubmitted}
                      onClick={() => !isSubmitted && onSelectSubAnswer?.(subQ.id, option)}
                    />
                  ))}
                </div>
                {/* Sub-question explanation */}
                {showResult && subQ.explanation && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <div 
                        className="text-xs text-foreground/80"
                        dangerouslySetInnerHTML={{ __html: subQ.explanation }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main question explanation */}
        {showResult && question.explanation && !hasSubQuestions && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary mb-1">Giải thích</p>
                <div 
                  className="text-sm text-foreground/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: question.explanation }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
