/**
 * StartQuizPage - Trang cấu hình trước khi bắt đầu làm bài
 * Cho phép chọn số lượng câu hỏi
 */
import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Play, BookOpen, Clock, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';
import { QuestionCountSelector } from '@/components/quiz/QuestionCountSelector';
import {
  getSubjectBySlug,
  getLevelBySlug,
  getSectionBySlug,
  getQuestionsBySection,
} from '@/data/quizData';

const QUESTION_COUNTS = [5, 10, 20, 50];

const StartQuizPage = () => {
  const { subjectSlug, levelSlug, sectionSlug } = useParams<{
    subjectSlug: string;
    levelSlug: string;
    sectionSlug: string;
  }>();
  const navigate = useNavigate();

  // Lấy thông tin
  const subject = subjectSlug ? getSubjectBySlug(subjectSlug) : undefined;
  const level = subject && levelSlug ? getLevelBySlug(subject.id, levelSlug) : undefined;
  const section = level && sectionSlug ? getSectionBySlug(level.id, sectionSlug) : undefined;
  const allQuestions = section ? getQuestionsBySection(section.id) : [];

  // State
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Set default count based on available questions
  useEffect(() => {
    if (allQuestions.length > 0) {
      const defaultCount = QUESTION_COUNTS.find((c) => c <= allQuestions.length) || allQuestions.length;
      setQuestionCount(Math.min(defaultCount, allQuestions.length));
    }
  }, [allQuestions.length]);

  // Redirect nếu không tìm thấy
  if (!subject) return <Navigate to="/subjects" replace />;
  if (!level) return <Navigate to={`/subjects/${subjectSlug}`} replace />;
  if (!section) return <Navigate to={`/subjects/${subjectSlug}/${levelSlug}`} replace />;

  const handleStartQuiz = () => {
    navigate(`/quiz/${subjectSlug}/${levelSlug}/${sectionSlug}?count=${questionCount}`);
  };

  // Tính thời gian ước tính (1.5 phút / câu)
  const estimatedMinutes = Math.ceil(questionCount * 1.5);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: 'Chọn môn học', href: '/subjects' },
              { label: subject.name, href: `/subjects/${subject.slug}` },
              { label: level.name, href: `/subjects/${subject.slug}/${level.slug}` },
              { label: section.name, href: `/subjects/${subject.slug}/${level.slug}/${section.slug}` },
              { label: 'Bắt đầu làm bài' },
            ]}
          />
        </div>

        {/* Main content */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-4xl">
                {section.icon}
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {section.name}
              </h1>
              <p className="text-muted-foreground">
                {subject.name} - {level.name}
              </p>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
                <HelpCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng câu hỏi</p>
                  <p className="font-semibold text-foreground">{allQuestions.length} câu</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Thời gian ước tính</p>
                  <p className="font-semibold text-foreground">~{estimatedMinutes} phút</p>
                </div>
              </div>
            </div>

            {/* Question count selector */}
            <div className="mb-8">
              <QuestionCountSelector
                counts={QUESTION_COUNTS}
                selectedCount={questionCount}
                maxAvailable={allQuestions.length}
                onSelect={setQuestionCount}
              />
            </div>

            {/* Start button */}
            <Button
              onClick={handleStartQuiz}
              size="lg"
              className="w-full gap-2"
              disabled={allQuestions.length === 0}
            >
              <Play className="h-5 w-5" />
              Bắt đầu làm bài ({questionCount} câu)
            </Button>

            {allQuestions.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Chưa có câu hỏi nào cho phần này. Vui lòng quay lại sau.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartQuizPage;
