/**
 * ListeningQuestionCard - Component hiển thị câu hỏi nghe theo format JLPT
 * 
 * Hỗ trợ 3 loại câu hỏi:
 * - standard: Hiển thị đầy đủ nội dung câu hỏi + đáp án text
 * - audio_only: Chỉ hiển thị số thứ tự ①②③④ (câu hỏi và đáp án trong audio)
 * - image_based: Hiển thị hình ảnh + số thứ tự
 */
import { Check, X, Lightbulb } from 'lucide-react';
import type { Question, ListeningQuestionType } from '@/hooks/useQuestions';
import { cn } from '@/lib/utils';
import { QuestionHistoryBadge } from './QuestionHistoryBadge';

// Ký hiệu số thứ tự kiểu Nhật
const OPTION_SYMBOLS: Record<string, string> = {
  A: '①',
  B: '②',
  C: '③',
  D: '④',
};

interface ListeningQuestionCardProps {
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

// Component hiển thị option cho audio_only type
function AudioOnlyOption({
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

// Component hiển thị option với text đầy đủ
function TextOption({
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
          OPTION_SYMBOLS[option]
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
  const optionKeys = ['A', 'B', 'C', 'D'].slice(0, optionCount) as ('A' | 'B' | 'C' | 'D')[];

  // TYPE_B: audio_only - chỉ hiển thị số thứ tự
  if (questionType === 'audio_only') {
    return (
      <div className="flex flex-wrap gap-3 justify-center py-4">
        {optionKeys.map((option) => (
          <AudioOnlyOption
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

  // TYPE_C: image_based - hiển thị hình ảnh nếu có, còn lại như standard
  // TYPE_A: standard - hiển thị đầy đủ text
  return (
    <div className="space-y-3">
      {optionKeys.map((option) => {
        const optionText = question.options[option];
        // Nếu không có text, hiển thị như audio_only
        if (!optionText || optionText.trim() === '') {
          return (
            <div key={option} className="flex justify-start">
              <AudioOnlyOption
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
          <TextOption
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

export function ListeningQuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
  isSubmitted = false,
  historyStats,
  subAnswers = {},
  onSelectSubAnswer,
}: ListeningQuestionCardProps) {
  const questionType = question.questionType || 'standard';
  const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
  
  // Với audio_only, không hiển thị nội dung câu hỏi (chỉ số thứ tự)
  const showQuestionContent = questionType !== 'audio_only' || question.content.trim() !== '';

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
               className="text-base font-medium text-foreground leading-relaxed whitespace-pre-line"
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

      {/* Content area */}
      <div className="pl-11 space-y-3">
        {/* Image - hiển thị cho tất cả loại nếu có */}
        {question.image_url && (
          <div className="mb-4">
            <img 
              src={question.image_url} 
              alt={`Hình minh họa câu hỏi nghe ${questionNumber}: ${question.content.replace(/<[^>]*>/g, '').slice(0, 80)}`}
              loading="lazy"
              className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl h-auto max-h-48 sm:max-h-64 md:max-h-80 rounded-lg object-contain border border-border mx-auto"
            />
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
                     className="mb-3 text-sm font-medium text-foreground whitespace-pre-line"
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
                      alt={`Hình minh họa câu nghe ${questionNumber}.${idx + 1}: ${subQ.content.replace(/<[^>]*>/g, '').slice(0, 60)}`}
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
