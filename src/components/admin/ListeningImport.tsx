/**
 * ListeningImport - Component nhập đề thi 聴解 (Listening) JLPT
 * 
 * Cấu trúc:
 * - 1 file audio duy nhất cho toàn bộ đề thi
 * - Chia câu hỏi theo Mondai (問題1, 問題2, ...)
 * - Mỗi Mondai có tiêu đề, mô tả, danh sách câu hỏi
 * - Hỗ trợ 3 loại câu hỏi: standard, audio_only, image_based
 * - Hỗ trợ câu hỏi con (sub-questions) trong mỗi câu hỏi
 * 
 * ISOLATED: Không ảnh hưởng đến các module import khác
 */
import { useCallback, useState, useMemo } from 'react';
import { 
  Plus, Trash2, ChevronDown, ChevronUp, Copy, Check, X, 
  Headphones, Image, Volume2, AlertCircle, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RichTextEditable } from '@/components/admin/RichTextEditable';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { cn } from '@/lib/utils';

// ===== Types =====

type ListeningQuestionType = 'standard' | 'audio_only' | 'image_based';

export interface ListeningSubQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  question_type?: ListeningQuestionType;
  option_count?: number;
  image_url?: string;
}

export interface ListeningMondaiQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  question_type?: ListeningQuestionType;
  option_count?: number;
  image_url?: string;
  subQuestions?: ListeningSubQuestion[];
}

export interface MondaiGroup {
  title: string;
  description: string;
  questions: ListeningMondaiQuestion[];
}

export interface ListeningExamData {
  audioUrl: string;
  mondais: MondaiGroup[];
}

// Flattened question for import
export interface ListeningImportQuestion {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  audio_url: string;
  image_url?: string;
  question_type?: ListeningQuestionType;
  option_count?: number;
  mondai_index: number;
  mondai_title: string;
  subQuestions?: ListeningSubQuestion[];
}

interface ListeningImportProps {
  onDataChange: (data: ListeningExamData) => void;
}

// ===== Helpers =====

function convertMarkupToHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[br\]/gi, '<br>')
    .replace(/\[b\](.*?)\[\/b\]/gi, '<b>$1</b>')
    .replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>')
    .replace(/\[i\](.*?)\[\/i\]/gi, '<i>$1</i>');
}

function removeQuestionNumber(text: string): string {
  return text.replace(/^\s*\d+\s*[.\-):]\s*/, '');
}

function processText(text: string): string {
  return convertMarkupToHtml(removeQuestionNumber(text?.trim() || ''));
}

const emptyQuestion: ListeningMondaiQuestion = {
  content: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: '',
  explanation: '',
  question_type: 'standard',
  option_count: 4,
  subQuestions: [],
};

const emptySubQuestion: ListeningSubQuestion = {
  content: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: '',
  explanation: '',
  question_type: 'standard',
  option_count: 4,
};

const defaultMondai: MondaiGroup = {
  title: '',
  description: '',
  questions: [{ ...emptyQuestion }],
};

// ===== Validation =====

function isValidSubQ(sq: ListeningSubQuestion): boolean {
  const type = sq.question_type ?? 'standard';
  if (type === 'audio_only') return !!sq.correct_option;
  const count = sq.option_count ?? 4;
  const opts = !!sq.option_a && !!sq.option_b &&
    (count < 3 || !!sq.option_c) && (count < 4 || !!sq.option_d);
  return !!sq.content && opts && !!sq.correct_option;
}

function isValidQuestion(q: ListeningMondaiQuestion): boolean {
  const type = q.question_type ?? 'standard';
  const count = q.option_count ?? 4;

  if (type === 'audio_only' && q.subQuestions && q.subQuestions.length > 0) {
    return q.subQuestions.some(isValidSubQ);
  }
  if (type === 'audio_only') return !!q.correct_option;
  if (!q.content) return false;

  const opts = !!q.option_a && !!q.option_b &&
    (count < 3 || !!q.option_c) && (count < 4 || !!q.option_d);
  const direct = opts && !!q.correct_option;
  const hasSubs = (q.subQuestions ?? []).some(isValidSubQ);
  return direct || hasSubs;
}

// ===== Sub-components =====

/** Individual question within a mondai */
function MondaiQuestionEditor({
  question,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  question: ListeningMondaiQuestion;
  index: number;
  onChange: (q: ListeningMondaiQuestion) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const type = question.question_type ?? 'standard';
  const optCount = question.option_count ?? 4;

  const updateField = (field: keyof ListeningMondaiQuestion, value: any) => {
    if (field === 'option_count') value = parseInt(value, 10);
    onChange({ ...question, [field]: value });
  };

  const updateSub = (subIdx: number, field: keyof ListeningSubQuestion, value: any) => {
    const subs = [...(question.subQuestions || [])];
    if (field === 'option_count') value = parseInt(value, 10);
    subs[subIdx] = { ...subs[subIdx], [field]: value };
    onChange({ ...question, subQuestions: subs });
  };

  const addSub = () => {
    onChange({ ...question, subQuestions: [...(question.subQuestions || []), { ...emptySubQuestion }] });
  };

  const removeSub = (subIdx: number) => {
    const subs = (question.subQuestions || []).filter((_, i) => i !== subIdx);
    onChange({ ...question, subQuestions: subs });
  };

  const valid = isValidQuestion(question);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className={cn(
        "rounded-lg border bg-card transition-colors",
        valid ? "border-border" : "border-warning/30"
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <span className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold",
            valid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <RichTextEditable
              value={question.content}
              placeholder={type === 'audio_only' ? '(Để trống nếu câu hỏi trong audio)' : 'Nội dung câu hỏi...'}
              onChange={(v) => updateField('content', v)}
              className="min-h-[36px] text-sm"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {question.image_url && <Image className="h-3 w-3 text-blue-500" />}
            {question.subQuestions && question.subQuestions.length > 0 && (
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded px-1">
                {question.subQuestions.length}câu con
              </span>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost" size="icon"
              onClick={onRemove} disabled={!canRemove}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        <CollapsibleContent>
          <div className="border-t border-border p-4 space-y-4">
            {/* Settings row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Loại câu hỏi</label>
                <Select value={type} onValueChange={(v) => updateField('question_type', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Chuẩn (text)</SelectItem>
                    <SelectItem value="audio_only">Audio only (①②③④)</SelectItem>
                    <SelectItem value="image_based">Hình ảnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Số đáp án</label>
                <Select value={String(optCount)} onValueChange={(v) => updateField('option_count', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hình ảnh</label>
                <MediaUpload type="image" value={question.image_url} onChange={(url) => updateField('image_url', url)} />
              </div>
            </div>

            {/* Direct answers (no sub-questions) */}
            {(!question.subQuestions || question.subQuestions.length === 0) && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).slice(0, optCount).map((opt) => (
                    <div key={opt}>
                      <label className="text-xs text-muted-foreground">Đáp án {opt}</label>
                      <RichTextEditable
                        value={question[`option_${opt.toLowerCase()}` as keyof ListeningMondaiQuestion] as string}
                        placeholder={type === 'audio_only' ? '—' : opt}
                        onChange={(v) => updateField(`option_${opt.toLowerCase()}` as keyof ListeningMondaiQuestion, v)}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Đáp án đúng</label>
                    <Select value={question.correct_option} onValueChange={(v) => updateField('correct_option', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="?" /></SelectTrigger>
                      <SelectContent>
                        {(['A', 'B', 'C', 'D'] as const).slice(0, optCount).map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Giải thích</label>
                    <RichTextEditable
                      value={question.explanation}
                      placeholder="(tùy chọn)"
                      onChange={(v) => updateField('explanation', v)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sub-questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-foreground">Câu hỏi con</h5>
                <Button type="button" variant="outline" size="sm" onClick={addSub} className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Thêm câu con
                </Button>
              </div>

              {(question.subQuestions || []).map((sq, si) => {
                const sqCount = sq.option_count ?? 4;
                const sqType = sq.question_type ?? 'standard';
                return (
                  <div key={si} className="rounded border border-dashed border-border/60 bg-muted/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Câu con {si + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeSub(si)} className="h-6 w-6">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <RichTextEditable
                      value={sq.content}
                      placeholder={sqType === 'audio_only' ? '(Để trống)' : 'Nội dung câu con...'}
                      onChange={(v) => updateSub(si, 'content', v)}
                      className="text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={sqType} onValueChange={(v) => updateSub(si, 'question_type', v)}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="audio_only">Audio Only</SelectItem>
                          <SelectItem value="image_based">Image</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={String(sqCount)} onValueChange={(v) => updateSub(si, 'option_count', v)}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 đáp án</SelectItem>
                          <SelectItem value="3">3 đáp án</SelectItem>
                          <SelectItem value="4">4 đáp án</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {sq.image_url !== undefined && (
                      <MediaUpload type="image" value={sq.image_url} onChange={(url) => updateSub(si, 'image_url', url || '')} />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {(['A', 'B', 'C', 'D'] as const).slice(0, sqCount).map(opt => (
                        <div key={opt}>
                          <label className="text-[10px] text-muted-foreground">{opt}</label>
                          <RichTextEditable
                            value={sq[`option_${opt.toLowerCase()}` as keyof ListeningSubQuestion] as string}
                            placeholder={sqType === 'audio_only' ? '—' : opt}
                            onChange={(v) => updateSub(si, `option_${opt.toLowerCase()}` as keyof ListeningSubQuestion, v)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-[80px_1fr] gap-2">
                      <Select value={sq.correct_option} onValueChange={(v) => updateSub(si, 'correct_option', v)}>
                        <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="?" /></SelectTrigger>
                        <SelectContent>
                          {(['A', 'B', 'C', 'D'] as const).slice(0, sqCount).map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <RichTextEditable
                        value={sq.explanation}
                        placeholder="Giải thích"
                        onChange={(v) => updateSub(si, 'explanation', v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/** Paste handler for batch questions per mondai */
function MondaiPasteArea({
  onParsed,
}: {
  onParsed: (questions: ListeningMondaiQuestion[]) => void;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const handleParse = () => {
    if (!text.trim()) return;
    const lines = text.trim().split('\n');
    const parsed: ListeningMondaiQuestion[] = [];

    for (const line of lines) {
      const vals = line.includes('\t') ? line.split('\t') : null;
      if (vals && vals.length >= 2) {
        // Tab-separated: content | A | B | C | D | correct | explanation | type | optCount
        let correct = vals[5]?.trim().toUpperCase() || '';
        if (correct.startsWith('OPTION_')) correct = correct.replace('OPTION_', '');
        const qType = (vals[7]?.trim().toLowerCase() || 'standard') as ListeningQuestionType;
        const optCount = parseInt(vals[8]?.trim() || '4', 10);

        parsed.push({
          content: processText(vals[0] || ''),
          option_a: convertMarkupToHtml(vals[1]?.trim() || ''),
          option_b: convertMarkupToHtml(vals[2]?.trim() || ''),
          option_c: convertMarkupToHtml(vals[3]?.trim() || ''),
          option_d: convertMarkupToHtml(vals[4]?.trim() || ''),
          correct_option: ['A', 'B', 'C', 'D'].includes(correct) ? correct : '',
          explanation: convertMarkupToHtml(vals[6]?.trim() || ''),
          question_type: ['standard', 'audio_only', 'image_based'].includes(qType) ? qType : 'standard',
          option_count: [2, 3, 4].includes(optCount) ? optCount : 4,
          subQuestions: [],
        });
      }
    }

    if (parsed.length > 0) {
      onParsed(parsed);
      setText('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1 text-xs">
        <Copy className="h-3 w-3" /> Paste từ Excel
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Mỗi dòng 1 câu: Nội dung | A | B | C | D | Đáp án đúng | Giải thích | Loại (standard/audio_only/image_based) | Số đáp án (2-4)
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste dữ liệu..."
        className="min-h-[80px] font-mono text-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleParse} disabled={!text.trim()} className="gap-1 h-7 text-xs">
          <Check className="h-3 w-3" /> Xác nhận
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setText(''); }} className="gap-1 h-7 text-xs">
          <X className="h-3 w-3" /> Hủy
        </Button>
      </div>
    </div>
  );
}

// ===== JSON Import =====

function JsonImportArea({ onParsed }: { onParsed: (data: ListeningExamData) => void }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const handleParse = () => {
    setError('');
    try {
      const json = JSON.parse(text);
      
      // Validate structure
      if (!json.audioSource && !json.audio_url) {
        setError('Thiếu trường "audioSource" hoặc "audio_url"');
        return;
      }
      if (!json.mondais || !Array.isArray(json.mondais)) {
        setError('Thiếu trường "mondais" (mảng)');
        return;
      }

      const audioUrl = json.audioSource || json.audio_url;
      const mondais: MondaiGroup[] = json.mondais.map((m: any, idx: number) => ({
        title: m.title || m.id || `問題${idx + 1}`,
        description: m.description || '',
        questions: (m.questions || []).map((q: any) => {
          const optCount = q.options?.length || q.option_count || 4;
          const options = q.options || [];
          
          // Parse sub-questions if present
          const subQuestions: ListeningSubQuestion[] = (q.subQuestions || q.sub_questions || []).map((sq: any) => {
            const sqOpts = sq.options || [];
            const sqCount = sqOpts.length || sq.option_count || 4;
            return {
              content: sq.content || sq.questionText || '',
              option_a: sqOpts[0]?.text || sqOpts[0] || sq.option_a || '',
              option_b: sqOpts[1]?.text || sqOpts[1] || sq.option_b || '',
              option_c: sqOpts[2]?.text || sqOpts[2] || sq.option_c || '',
              option_d: sqOpts[3]?.text || sqOpts[3] || sq.option_d || '',
              correct_option: sq.correct_option || sq.answer || '',
              explanation: sq.explanation || '',
              question_type: sq.question_type || (sq.hasTextOptions === false ? 'audio_only' : 'standard'),
              option_count: Math.min(sqCount, 4),
              image_url: sq.imageUrl || sq.image_url || undefined,
            } as ListeningSubQuestion;
          });

          return {
            content: q.content || q.questionText || '',
            option_a: options[0]?.text || options[0] || q.option_a || '',
            option_b: options[1]?.text || options[1] || q.option_b || '',
            option_c: options[2]?.text || options[2] || q.option_c || '',
            option_d: options[3]?.text || options[3] || q.option_d || '',
            correct_option: q.correct_option || q.answer || '',
            explanation: q.explanation || '',
            question_type: q.question_type || (q.hasTextOptions === false ? 'audio_only' : (q.hasImage ? 'image_based' : 'standard')),
            option_count: Math.min(optCount, 4),
            image_url: q.imageUrl || q.image_url || undefined,
            subQuestions,
          } as ListeningMondaiQuestion;
        }),
      }));

      onParsed({ audioUrl, mondais });
      setText('');
      setOpen(false);
    } catch (e) {
      setError('JSON không hợp lệ: ' + (e as Error).message);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1 text-xs">
        <FileText className="h-3 w-3" /> Import từ JSON
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Paste JSON theo cấu trúc: {'{'} "audioSource": "url", "mondais": [{'{'} "title": "問題5", "description": "...", "questions": [{'{'} "content": "...", "question_type": "audio_only", "correct_option": "A", "subQuestions": [{'{'}"content": "質問1", "option_a": "...", ...{'}'}] {'}'}] {'}'}] {'}'}
      </p>
      <Textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setError(''); }}
        placeholder='{"audioSource": "...", "mondais": [...]}'
        className="min-h-[120px] font-mono text-xs"
      />
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleParse} disabled={!text.trim()} className="gap-1 h-7 text-xs">
          <Check className="h-3 w-3" /> Parse JSON
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setText(''); setError(''); }} className="gap-1 h-7 text-xs">
          <X className="h-3 w-3" /> Hủy
        </Button>
      </div>
    </div>
  );
}

// ===== Main Component =====

export function ListeningImport({ onDataChange }: ListeningImportProps) {
  const [audioUrl, setAudioUrl] = useState('');
  const [mondais, setMondais] = useState<MondaiGroup[]>([
    { ...defaultMondai, title: '問題1' },
  ]);
  const [expandedMondais, setExpandedMondais] = useState<Set<number>>(new Set([0]));

  // Notify parent on any change
  const notifyChange = useCallback((newAudio: string, newMondais: MondaiGroup[]) => {
    onDataChange({ audioUrl: newAudio, mondais: newMondais });
  }, [onDataChange]);

  const updateAudio = useCallback((url: string) => {
    setAudioUrl(url);
    notifyChange(url, mondais);
  }, [mondais, notifyChange]);

  const updateMondais = useCallback((newMondais: MondaiGroup[]) => {
    setMondais(newMondais);
    notifyChange(audioUrl, newMondais);
  }, [audioUrl, notifyChange]);

  const addMondai = useCallback(() => {
    const nextIdx = mondais.length + 1;
    const newMondais = [...mondais, { ...defaultMondai, title: `問題${nextIdx}`, questions: [{ ...emptyQuestion }] }];
    setExpandedMondais(prev => new Set([...prev, mondais.length]));
    updateMondais(newMondais);
  }, [mondais, updateMondais]);

  const removeMondai = useCallback((idx: number) => {
    if (mondais.length <= 1) return;
    const newMondais = mondais.filter((_, i) => i !== idx);
    setExpandedMondais(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
    updateMondais(newMondais);
  }, [mondais, updateMondais]);

  const updateMondaiField = useCallback((idx: number, field: keyof MondaiGroup, value: any) => {
    const newMondais = [...mondais];
    newMondais[idx] = { ...newMondais[idx], [field]: value };
    updateMondais(newMondais);
  }, [mondais, updateMondais]);

  const updateMondaiQuestion = useCallback((mondaiIdx: number, qIdx: number, q: ListeningMondaiQuestion) => {
    const newMondais = [...mondais];
    const questions = [...newMondais[mondaiIdx].questions];
    questions[qIdx] = q;
    newMondais[mondaiIdx] = { ...newMondais[mondaiIdx], questions };
    updateMondais(newMondais);
  }, [mondais, updateMondais]);

  const addQuestion = useCallback((mondaiIdx: number) => {
    const newMondais = [...mondais];
    newMondais[mondaiIdx] = {
      ...newMondais[mondaiIdx],
      questions: [...newMondais[mondaiIdx].questions, { ...emptyQuestion }],
    };
    updateMondais(newMondais);
  }, [mondais, updateMondais]);

  const removeQuestion = useCallback((mondaiIdx: number, qIdx: number) => {
    const newMondais = [...mondais];
    if (newMondais[mondaiIdx].questions.length <= 1) return;
    newMondais[mondaiIdx] = {
      ...newMondais[mondaiIdx],
      questions: newMondais[mondaiIdx].questions.filter((_, i) => i !== qIdx),
    };
    updateMondais(newMondais);
  }, [mondais, updateMondais]);

  const handlePastedQuestions = useCallback((mondaiIdx: number, questions: ListeningMondaiQuestion[]) => {
    const newMondais = [...mondais];
    newMondais[mondaiIdx] = {
      ...newMondais[mondaiIdx],
      questions: [...newMondais[mondaiIdx].questions, ...questions],
    };
    updateMondais(newMondais);
  }, [mondais, updateMondais]);

  const handleJsonImport = useCallback((data: ListeningExamData) => {
    setAudioUrl(data.audioUrl);
    setMondais(data.mondais);
    setExpandedMondais(new Set(data.mondais.map((_, i) => i)));
    notifyChange(data.audioUrl, data.mondais);
  }, [notifyChange]);

  // Stats
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let validQuestions = 0;
    mondais.forEach(m => {
      m.questions.forEach(q => {
        totalQuestions++;
        if (isValidQuestion(q)) validQuestions++;
      });
    });
    return { totalQuestions, validQuestions, mondaiCount: mondais.length };
  }, [mondais]);

  const toggleMondai = (idx: number) => {
    setExpandedMondais(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <Headphones className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Import đề thi 聴解 (Listening)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nhập 1 file audio duy nhất và chia câu hỏi theo Mondai (問題). 
            Mỗi mondai có thể chứa nhiều câu hỏi với các loại khác nhau.
          </p>
        </div>
      </div>

      {/* Import tools */}
      <div className="flex items-center gap-2 flex-wrap">
        <JsonImportArea onParsed={handleJsonImport} />
      </div>

      {/* Audio URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Audio đề thi (URL)</label>
        <div className="flex gap-2">
          <Input
            value={audioUrl}
            onChange={(e) => updateAudio(e.target.value)}
            placeholder="https://... hoặc upload bên dưới"
            className="flex-1"
          />
          <MediaUpload
            type="audio"
            value={audioUrl || undefined}
            onChange={(url) => updateAudio(url || '')}
          />
        </div>
        {audioUrl && (
          <audio src={audioUrl} controls className="w-full h-10 mt-1" />
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {stats.mondaiCount} mondai • {stats.validQuestions}/{stats.totalQuestions} câu hợp lệ
        </span>
        {!audioUrl && (
          <span className="flex items-center gap-1 text-xs text-warning">
            <AlertCircle className="h-3 w-3" /> Chưa có audio
          </span>
        )}
      </div>

      {/* Mondai sections */}
      <div className="space-y-4">
        {mondais.map((mondai, mIdx) => {
          const mondaiValid = mondai.questions.filter(isValidQuestion).length;
          return (
            <Collapsible key={mIdx} open={expandedMondais.has(mIdx)} onOpenChange={() => toggleMondai(mIdx)}>
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Mondai header */}
                <div className="flex items-center gap-3 bg-muted/50 px-4 py-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      {expandedMondais.has(mIdx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={mondai.title}
                      onChange={(e) => updateMondaiField(mIdx, 'title', e.target.value)}
                      placeholder={`問題${mIdx + 1}`}
                      className="h-8 text-sm font-medium bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {mondaiValid}/{mondai.questions.length} câu
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => removeMondai(mIdx)}
                    disabled={mondais.length <= 1}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mondai content */}
                <CollapsibleContent>
                  <div className="p-4 space-y-4">
                    {/* Description */}
                    <div>
                      <label className="text-xs text-muted-foreground">Mô tả / Hướng dẫn Mondai (hiển thị cho thí sinh)</label>
                      <Textarea
                        value={mondai.description}
                        onChange={(e) => updateMondaiField(mIdx, 'description', e.target.value)}
                        placeholder="VD: 問題用紙に何もいんさつされていません。まず話を聞いてください。それから、質問とせんたくしを聞いて、1 から 4 の中から、最もよいものを一つ選んでください。"
                        className="text-sm min-h-[60px]"
                        rows={2}
                      />
                    </div>

                    {/* Paste area */}
                    <MondaiPasteArea onParsed={(qs) => handlePastedQuestions(mIdx, qs)} />

                    {/* Questions */}
                    <div className="space-y-3">
                      {mondai.questions.map((q, qIdx) => (
                        <MondaiQuestionEditor
                          key={qIdx}
                          question={q}
                          index={qIdx}
                          onChange={(updated) => updateMondaiQuestion(mIdx, qIdx, updated)}
                          onRemove={() => removeQuestion(mIdx, qIdx)}
                          canRemove={mondai.questions.length > 1}
                        />
                      ))}
                    </div>

                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => addQuestion(mIdx)}
                      className="gap-1 w-full"
                    >
                      <Plus className="h-3 w-3" /> Thêm câu hỏi vào {mondai.title || `問題${mIdx + 1}`}
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Add mondai */}
      <Button type="button" variant="outline" onClick={addMondai} className="gap-2 w-full">
        <Plus className="h-4 w-4" /> Thêm Mondai (問題)
      </Button>
    </div>
  );
}

// ===== Export helpers =====

/** Flatten mondai structure to importable questions */
export function flattenListeningExam(data: ListeningExamData): ListeningImportQuestion[] {
  const result: ListeningImportQuestion[] = [];
  
  data.mondais.forEach((mondai, mIdx) => {
    mondai.questions.forEach((q) => {
      result.push({
        content: q.content,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        explanation: q.explanation,
        audio_url: data.audioUrl,
        image_url: q.image_url,
        question_type: q.question_type,
        option_count: q.option_count,
        mondai_index: mIdx + 1,
        mondai_title: mondai.title || `問題${mIdx + 1}`,
        subQuestions: q.subQuestions,
      });
    });
  });

  return result;
}

/** Count valid questions in exam data */
export function countValidListeningQuestions(data: ListeningExamData): number {
  let count = 0;
  data.mondais.forEach(m => {
    m.questions.forEach(q => {
      if (isValidQuestion(q)) count++;
    });
  });
  return count;
}
