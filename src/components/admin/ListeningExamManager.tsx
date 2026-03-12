/**
 * ListeningExamManager - Quản lý câu hỏi nghe theo từng đề (nhóm theo audio_url)
 * Hiển thị danh sách đề nghe, mỗi đề có thể mở rộng xem câu hỏi bên trong.
 * Hỗ trợ xóa toàn bộ đề.
 */
import { useState, useMemo, useCallback } from 'react';
import { 
  Headphones, ChevronDown, ChevronUp, Trash2, Pencil, Clock, 
  FileText, Loader2, Volume2, CheckSquare, Square, XCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAudioDurations } from '@/hooks/useAudioDurations';
import { cn } from '@/lib/utils';

interface QuestionRow {
  id: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  explanation: string | null;
  section_id: string;
  created_at: string;
  parent_id?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  question_type?: string | null;
  option_count?: number | null;
  mondai_index?: number | null;
  mondai_title?: string | null;
}

interface ListeningExamGroup {
  audioUrl: string;
  questions: QuestionRow[]; // all questions (parents + children) with this audio_url
  parentCount: number;
  totalCount: number; // including sub-questions
  createdAt: string;
}

interface ListeningExamManagerProps {
  questions: QuestionRow[];
  onQuestionsChanged: () => void;
  onEditQuestion: (question: any) => void;
  variant?: 'listening' | 'driving';
}

function groupByExam(questions: QuestionRow[]): ListeningExamGroup[] {
  const byAudio = new Map<string, QuestionRow[]>();

  for (const q of questions) {
    const url = q.audio_url || '__no_audio__';
    if (!byAudio.has(url)) byAudio.set(url, []);
    byAudio.get(url)!.push(q);
  }

  const exams: ListeningExamGroup[] = [];
  for (const [audioUrl, qs] of byAudio) {
    if (audioUrl === '__no_audio__') continue;
    const parents = qs.filter(q => !q.parent_id);
    const earliest = qs.reduce((min, q) => 
      q.created_at < min ? q.created_at : min, qs[0].created_at
    );
    exams.push({
      audioUrl,
      questions: qs,
      parentCount: parents.length,
      totalCount: qs.length,
      createdAt: earliest,
    });
  }

  // Sort by created_at desc (newest first)
  exams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return exams;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ListeningExamManager({
  questions,
  onQuestionsChanged,
  onEditQuestion,
  variant = 'listening',
}: ListeningExamManagerProps) {
  const isDriving = variant === 'driving';
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [deletingExam, setDeletingExam] = useState<ListeningExamGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Bulk selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [showDeleteSelectedDialog, setShowDeleteSelectedDialog] = useState(false);

  const exams = useMemo(() => groupByExam(questions), [questions]);

  const audioUrls = useMemo(() => exams.map(e => e.audioUrl), [exams]);
  const { durations } = useAudioDurations(isDriving ? [] : audioUrls);

  const toggleExam = (audioUrl: string) => {
    setExpandedExams(prev => {
      const next = new Set(prev);
      if (next.has(audioUrl)) next.delete(audioUrl);
      else next.add(audioUrl);
      return next;
    });
  };

  const handleDeleteExam = useCallback(async () => {
    if (!deletingExam) return;
    setDeleting(true);
    try {
      const ids = deletingExam.questions.map(q => q.id);
      
      // Delete children first (those with parent_id)
      const childIds = deletingExam.questions.filter(q => q.parent_id).map(q => q.id);
      if (childIds.length > 0) {
        const { error } = await supabase.from('questions').delete().in('id', childIds);
        if (error) throw error;
      }

      // Then delete parents
      const parentIds = deletingExam.questions.filter(q => !q.parent_id).map(q => q.id);
      if (parentIds.length > 0) {
        const { error } = await supabase.from('questions').delete().in('id', parentIds);
        if (error) throw error;
      }

      // Delete audio file from storage
      try {
        const match = deletingExam.audioUrl.match(/\/object\/public\/question-media\/(.+)$/);
        if (match && match[1]) {
          await supabase.storage.from('question-media').remove([decodeURIComponent(match[1])]);
        }
      } catch {}

      toast.success(`Đã xóa đề nghe (${ids.length} câu hỏi)`);
      setDeletingExam(null);
      onQuestionsChanged();
    } catch (err) {
      console.error('Error deleting exam:', err);
      toast.error('Lỗi khi xóa đề nghe');
    } finally {
      setDeleting(false);
    }
  }, [deletingExam, onQuestionsChanged]);

  // Bulk selection helpers
  const toggleQuestion = useCallback((id: string) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleExamQuestions = useCallback((exam: ListeningExamGroup) => {
    const parentIds = exam.questions.filter(q => !q.parent_id).map(q => q.id);
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      const allSelected = parentIds.every(id => next.has(id));
      if (allSelected) {
        parentIds.forEach(id => next.delete(id));
      } else {
        parentIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedQuestions(new Set());
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedQuestions.size === 0) return;
    setDeletingSelected(true);
    try {
      // Find all child question IDs for selected parents
      const childIds = questions
        .filter(q => q.parent_id && selectedQuestions.has(q.parent_id))
        .map(q => q.id);

      // Delete children first
      if (childIds.length > 0) {
        const { error } = await supabase.from('questions').delete().in('id', childIds);
        if (error) throw error;
      }

      // Delete selected parents
      const parentIds = Array.from(selectedQuestions);
      if (parentIds.length > 0) {
        const { error } = await supabase.from('questions').delete().in('id', parentIds);
        if (error) throw error;
      }

      toast.success(`Đã xóa ${parentIds.length} câu hỏi`);
      setSelectedQuestions(new Set());
      setShowDeleteSelectedDialog(false);
      onQuestionsChanged();
    } catch (err) {
      console.error('Error deleting selected questions:', err);
      toast.error('Lỗi khi xóa câu hỏi');
    } finally {
      setDeletingSelected(false);
    }
  }, [selectedQuestions, questions, onQuestionsChanged]);

  // Group parent questions with children, then organize by mondai
  const getParentQuestions = (examQuestions: QuestionRow[]) => {
    const parents = examQuestions.filter(q => !q.parent_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const childMap = new Map<string, QuestionRow[]>();
    examQuestions.filter(q => q.parent_id).forEach(q => {
      const list = childMap.get(q.parent_id!) || [];
      list.push(q);
      childMap.set(q.parent_id!, list);
    });
    return parents.map(p => ({
      ...p,
      subQuestions: (childMap.get(p.id) || []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));
  };

  // Group questions by mondai within an exam
  const getMondaiGroups = (examQuestions: QuestionRow[]) => {
    const parentQs = getParentQuestions(examQuestions);
    const groups = new Map<number, { mondaiIndex: number; mondaiTitle: string; questions: typeof parentQs }>();
    
    for (const q of parentQs) {
      const idx = q.mondai_index ?? 0;
      if (!groups.has(idx)) {
        groups.set(idx, {
          mondaiIndex: idx,
          mondaiTitle: q.mondai_title || `問題${idx}`,
          questions: [],
        });
      }
      groups.get(idx)!.questions.push(q);
    }
    
    return Array.from(groups.values()).sort((a, b) => a.mondaiIndex - b.mondaiIndex);
  };

  if (exams.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        {isDriving ? (
          <span className="mx-auto mb-4 block text-4xl">🚗</span>
        ) : (
          <Headphones className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        )}
        <p className="text-muted-foreground">{isDriving ? 'Chưa có đề thi nào' : 'Chưa có đề nghe nào'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="px-4 py-2 bg-muted/20 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          {isDriving ? (
            <><span className="inline mr-1">🚗</span>{exams.length} đề thi • {questions.filter(q => !q.parent_id).length} câu hỏi</>
          ) : (
            <><Headphones className="inline h-4 w-4 mr-1" />{exams.length} đề nghe • {questions.filter(q => !q.parent_id).length} câu hỏi chính</>
          )}
        </p>
      </div>

      {/* Exam list */}
      {exams.map((exam, idx) => {
        const duration = durations.get(exam.audioUrl) || 0;
        const mondaiGroups = getMondaiGroups(exam.questions);
        const isExpanded = expandedExams.has(exam.audioUrl);

        return (
          <Collapsible key={exam.audioUrl} open={isExpanded} onOpenChange={() => toggleExam(exam.audioUrl)}>
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Exam header */}
              <div className="flex items-center gap-3 bg-muted/50 px-4 py-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>

                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDriving ? 'bg-yellow-100' : 'bg-primary/10'}`}>
                  {isDriving ? (
                    <span className="text-xl">🚗</span>
                  ) : (
                    <Headphones className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">
                    {isDriving ? `Đề thi #${idx + 1}` : `Đề nghe #${idx + 1}`}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {exam.parentCount} câu chính
                      {exam.totalCount > exam.parentCount && ` (${exam.totalCount} tổng)`}
                    </span>
                    {duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(duration)}
                      </span>
                    )}
                    <span>
                      {new Date(exam.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeletingExam(exam); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Exam content */}
              <CollapsibleContent>
                <div className="border-t border-border">
                  {/* Audio player - only for listening exams */}
                  {!isDriving && (
                    <div className="px-4 py-3 bg-card border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Volume2 className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Audio</span>
                      </div>
                      <audio src={exam.audioUrl} controls className="w-full h-8" />
                    </div>
                  )}

                  {/* Questions grouped by Mondai */}
                  {mondaiGroups.map((mondai) => (
                    <div key={mondai.mondaiIndex}>
                      {/* Mondai header */}
                      <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{mondai.mondaiTitle}</span>
                        <span className="text-[10px] text-muted-foreground">({mondai.questions.length} câu)</span>
                      </div>

                      {/* Questions in this mondai */}
                      <div className="divide-y divide-border">
                        {mondai.questions.map((q, qIdx) => (
                          <div key={q.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start gap-3">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary mt-0.5">
                                {qIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div
                                  className="text-sm text-foreground"
                                  dangerouslySetInnerHTML={{
                                    __html: q.content || '<em class="text-muted-foreground">Câu hỏi trong audio</em>'
                                  }}
                                />
                                {/* Question type badge + options */}
                                <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-muted-foreground">
                                  {q.question_type && q.question_type !== 'standard' && (
                                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                                      {q.question_type === 'audio_only' ? '🎧 Audio Only' : '🖼️ Image'}
                                    </span>
                                  )}
                                  <span className={cn(
                                    q.correct_option === 'A' && 'text-emerald-600 dark:text-emerald-400 font-medium'
                                  )}>
                                    ①<span dangerouslySetInnerHTML={{ __html: q.option_a || '—' }} />
                                  </span>
                                  <span className={cn(
                                    q.correct_option === 'B' && 'text-emerald-600 dark:text-emerald-400 font-medium'
                                  )}>
                                    ②<span dangerouslySetInnerHTML={{ __html: q.option_b || '—' }} />
                                  </span>
                                  {(q.option_count ?? 4) >= 3 && (
                                    <span className={cn(
                                      q.correct_option === 'C' && 'text-emerald-600 dark:text-emerald-400 font-medium'
                                    )}>
                                      ③<span dangerouslySetInnerHTML={{ __html: q.option_c || '—' }} />
                                    </span>
                                  )}
                                  {(q.option_count ?? 4) >= 4 && (
                                    <span className={cn(
                                      q.correct_option === 'D' && 'text-emerald-600 dark:text-emerald-400 font-medium'
                                    )}>
                                      ④<span dangerouslySetInnerHTML={{ __html: q.option_d || '—' }} />
                                    </span>
                                  )}
                                </div>

                                {/* Sub-questions */}
                                {q.subQuestions && q.subQuestions.length > 0 && (
                                  <div className="mt-2 ml-2 space-y-1 border-l-2 border-border pl-3">
                                    {q.subQuestions.map((sq, sqIdx) => (
                                      <div key={sq.id} className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                          Câu con {sqIdx + 1}:
                                        </span>{' '}
                                        <span dangerouslySetInnerHTML={{ 
                                          __html: sq.content || '(audio)' 
                                        }} />
                                        <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                                          ✓{sq.correct_option}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onEditQuestion({
                                    ...q,
                                    subQuestions: q.subQuestions || [],
                                  })}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {/* Delete exam dialog */}
      <AlertDialog open={!!deletingExam} onOpenChange={(open) => !open && setDeletingExam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isDriving ? 'Xóa đề thi?' : 'Xóa đề nghe?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isDriving
                ? `Bạn có chắc muốn xóa toàn bộ đề thi này? Tất cả ${deletingExam?.totalCount || 0} câu hỏi sẽ bị xóa vĩnh viễn.`
                : `Bạn có chắc muốn xóa toàn bộ đề nghe này? Tất cả ${deletingExam?.totalCount || 0} câu hỏi và file audio sẽ bị xóa vĩnh viễn.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDriving ? 'Xóa đề' : 'Xóa đề'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
