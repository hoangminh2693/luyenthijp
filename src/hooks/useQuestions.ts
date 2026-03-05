import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Loại câu hỏi nghe theo format JLPT
export type ListeningQuestionType = 'standard' | 'audio_only' | 'image_based';

export interface Question {
  id: string;
  content: string;
  options: {
    A: string;
    B: string;
    C?: string;
    D?: string;
  };
  correctOption?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  section_id: string;
  image_url?: string;
  audio_url?: string;
  parent_id?: string;
  subQuestions?: Question[];
  questionType?: ListeningQuestionType;
  optionCount?: number;
  mondaiIndex?: number;
  mondaiTitle?: string;
}

// Safe question from view (no correct_option, no explanation)
interface DbQuestionSafe {
  id: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  section_id: string;
  image_url: string | null;
  audio_url: string | null;
  parent_id: string | null;
  question_type: ListeningQuestionType | null;
  option_count: number | null;
  mondai_index: number | null;
  mondai_title: string | null;
  created_at: string | null;
}

// Full question (for admin - includes answers)
interface DbQuestion {
  id: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  explanation: string | null;
  section_id: string;
  image_url: string | null;
  audio_url: string | null;
  parent_id: string | null;
  question_type: ListeningQuestionType | null;
  option_count: number | null;
}

// Chuyển đổi dữ liệu từ database (safe view - không có đáp án)
function mapDbQuestionSafe(dbQuestion: DbQuestionSafe): Question {
  const optionCount = dbQuestion.option_count ?? 4;
  
  return {
    id: dbQuestion.id,
    content: dbQuestion.content,
    options: {
      A: dbQuestion.option_a,
      B: dbQuestion.option_b,
      C: optionCount >= 3 ? (dbQuestion.option_c || '') : undefined,
      D: optionCount >= 4 ? (dbQuestion.option_d || '') : undefined,
    },
    section_id: dbQuestion.section_id,
    image_url: dbQuestion.image_url || undefined,
    audio_url: dbQuestion.audio_url || undefined,
    parent_id: dbQuestion.parent_id || undefined,
    questionType: dbQuestion.question_type || 'standard',
    optionCount: optionCount,
    mondaiIndex: dbQuestion.mondai_index ?? undefined,
    mondaiTitle: dbQuestion.mondai_title ?? undefined,
  };
}

// Chuyển đổi dữ liệu từ database (full - có đáp án, cho admin)
function mapDbQuestion(dbQuestion: DbQuestion): Question {
  const optionCount = dbQuestion.option_count ?? 4;
  
  return {
    id: dbQuestion.id,
    content: dbQuestion.content,
    options: {
      A: dbQuestion.option_a,
      B: dbQuestion.option_b,
      C: optionCount >= 3 ? (dbQuestion.option_c || '') : undefined,
      D: optionCount >= 4 ? (dbQuestion.option_d || '') : undefined,
    },
    correctOption: dbQuestion.correct_option as 'A' | 'B' | 'C' | 'D',
    explanation: dbQuestion.explanation || undefined,
    section_id: dbQuestion.section_id,
    image_url: dbQuestion.image_url || undefined,
    audio_url: dbQuestion.audio_url || undefined,
    parent_id: dbQuestion.parent_id || undefined,
    questionType: dbQuestion.question_type || 'standard',
    optionCount: optionCount,
  };
}

// Normalize text to compare duplicate questions safely
function normalizeText(value: string | undefined): string {
  return (value || '')
    .replace(/<[^>]*>/g, '') // strip HTML
    .replace(/[\s\u3000\u00A0]+/g, ' ') // collapse whitespace
    .replace(/[。、．，！？!?,.\-\u200B]/g, '') // strip punctuation
    .trim()
    .toLowerCase();
}

function buildQuestionSignature(question: Question): string {
  const options = ['A', 'B', 'C', 'D']
    .map((key) => `${key}:${normalizeText(question.options[key as 'A' | 'B' | 'C' | 'D'])}`)
    .join('|');

  const subSignature = question.subQuestions?.length
    ? `|subs:${question.subQuestions.map(buildQuestionSignature).join('||')}`
    : '';

  return [
    normalizeText(question.content),
    options,
    `type:${question.questionType || 'standard'}`,
    `count:${question.optionCount ?? 4}`,
    subSignature,
  ].join('|');
}

// Filter true duplicates only (same stem + options + children), avoid dropping valid similar stems
function deduplicateQuestions(questions: Question[]): Question[] {
  const seen = new Set<string>();
  return questions.filter((q) => {
    const key = buildQuestionSignature(q);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Nhóm câu hỏi cha với câu hỏi con (safe version)
function groupQuestionsWithChildrenSafe(questions: DbQuestionSafe[]): Question[] {
  // Sort by created_at to preserve import order
  const sorted = [...questions].sort((a, b) => 
    (a.created_at || '').localeCompare(b.created_at || '')
  );
  const parentQuestions = sorted.filter(q => !q.parent_id);
  const childQuestions = sorted.filter(q => q.parent_id);
  
  return parentQuestions.map(parent => {
    const mapped = mapDbQuestionSafe(parent);
    const children = childQuestions.filter(c => c.parent_id === parent.id);
    if (children.length > 0) {
      mapped.subQuestions = children.map(mapDbQuestionSafe);
    }
    return mapped;
  });
}

// Nhóm câu hỏi cha với câu hỏi con (full version for admin)
function groupQuestionsWithChildren(questions: DbQuestion[]): Question[] {
  const parentQuestions = questions.filter(q => !q.parent_id);
  const childQuestions = questions.filter(q => q.parent_id);
  
  return parentQuestions.map(parent => {
    const mapped = mapDbQuestion(parent);
    const children = childQuestions.filter(c => c.parent_id === parent.id);
    if (children.length > 0) {
      mapped.subQuestions = children.map(mapDbQuestion);
    }
    return mapped;
  });
}

// Hook lấy câu hỏi theo section_id (cho admin - có đáp án)
export function useQuestionsBySection(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'section', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      
      // Admin query - uses the full questions table (requires admin role via RLS)
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('section_id', sectionId);
      
      if (error) throw error;
      return (data || []).map(mapDbQuestion);
    },
    enabled: !!sectionId,
  });
}

// Hook lấy câu hỏi từ section/category (SECURE - không có đáp án)
// shuffle: true = xáo trộn ngẫu nhiên, false = giữ nguyên thứ tự (fixed_exam_mode)
export function useRandomQuestions(sectionId: string | undefined, count: number, sessionId?: string, categoryId?: string, shuffle: boolean = true) {
  return useQuery({
    queryKey: ['questions', 'random', sectionId, categoryId, count, sessionId, shuffle],
    queryFn: async () => {
      if (!sectionId && !categoryId) return [];
      
      // Fetch from both sources and merge
      let allData: DbQuestionSafe[] = [];
      
      if (sectionId) {
        const { data, error } = await supabase
          .from('questions_safe')
          .select('*')
          .eq('section_id', sectionId);
        if (!error && data) allData.push(...(data as DbQuestionSafe[]));
      }
      
      if (categoryId) {
        const { data, error } = await supabase
          .from('questions_safe')
          .select('*')
          .eq('category_id', categoryId);
        if (!error && data) {
          const existingIds = new Set(allData.map(q => q.id));
          for (const q of data as DbQuestionSafe[]) {
            if (!existingIds.has(q.id)) allData.push(q);
          }
        }
      }
      
      // Nhóm câu hỏi cha với câu con, sau đó chỉ loại trùng thực sự
      const grouped = deduplicateQuestions(groupQuestionsWithChildrenSafe(allData));
      
      if (shuffle) {
        // Shuffle đều hơn với Fisher-Yates rồi lấy số lượng cần thiết
        const shuffled = [...grouped];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, Math.min(count, shuffled.length));
      } else {
        // Fixed exam mode: giữ nguyên thứ tự, lấy đúng số lượng
        return grouped.slice(0, Math.min(count, grouped.length));
      }
    },
    enabled: (!!sectionId || !!categoryId) && count > 0,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

// Hook lấy số lượng câu hỏi theo section
export function useQuestionCount(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'count', sectionId],
    queryFn: async () => {
      if (!sectionId) return 0;
      
      // Use safe view for counting
      const { count, error } = await supabase
        .from('questions_safe')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', sectionId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!sectionId,
  });
}

// Interface cho đề nghe (listening exam)
export interface ListeningExam {
  audioUrl: string;
  questions: Question[];
  questionCount: number;
}

// Hook lấy danh sách các đề nghe (nhóm theo audio_url) cho phần 聴解
// Supports both section_id (legacy) and category_id (dynamic layer)
export function useListeningExams(sectionId: string | undefined, categoryId?: string) {
  return useQuery({
    queryKey: ['listening-exams', sectionId, categoryId],
    queryFn: async () => {
      if (!sectionId && !categoryId) return [];
      
      // Fetch from both sources and merge
      let allQuestions: DbQuestionSafe[] = [];
      
      if (sectionId) {
        const { data, error } = await supabase
          .from('questions_safe')
          .select('*')
          .eq('section_id', sectionId);
        if (!error && data) allQuestions.push(...(data as DbQuestionSafe[]));
      }
      
      if (categoryId) {
        const { data, error } = await supabase
          .from('questions_safe')
          .select('*')
          .eq('category_id', categoryId);
        if (!error && data) {
          // Deduplicate by id
          const existingIds = new Set(allQuestions.map(q => q.id));
          for (const q of data as DbQuestionSafe[]) {
            if (!existingIds.has(q.id)) allQuestions.push(q);
          }
        }
      }
      const parentQuestions = allQuestions.filter(q => !q.parent_id && q.audio_url);
      
      // Nhóm theo audio_url - mỗi audio = 1 đề nghe
      const examsByAudio = new Map<string, DbQuestionSafe[]>();
      
      for (const q of parentQuestions) {
        if (!q.audio_url) continue;
        if (!examsByAudio.has(q.audio_url)) {
          examsByAudio.set(q.audio_url, []);
        }
        examsByAudio.get(q.audio_url)!.push(q);
      }
      
      // Chuyển đổi thành mảng ListeningExam, including children
      const exams: ListeningExam[] = [];
      
      for (const [audioUrl, parents] of examsByAudio) {
        const parentIds = new Set(parents.map(p => p.id));
        const children = allQuestions.filter(q => q.parent_id && parentIds.has(q.parent_id));
        const grouped = groupQuestionsWithChildrenSafe([...parents, ...children]);
        const questionCount = grouped.reduce((total, q) => {
          if (q.subQuestions && q.subQuestions.length > 0) {
            return total + q.subQuestions.length;
          }
          return total + 1;
        }, 0);
        
        exams.push({
          audioUrl,
          questions: grouped,
          questionCount,
        });
      }
      
      return exams;
    },
    enabled: !!sectionId || !!categoryId,
  });
}

// Hook lấy 1 đề nghe ngẫu nhiên cho phần 聴解
// Supports both section_id (legacy) and category_id (dynamic layer)
export function useRandomListeningExam(
  sectionId: string | undefined, 
  enabled: boolean = true, 
  sessionId?: string,
  categoryId?: string
) {
  return useQuery({
    queryKey: ['listening-exam', 'random', sectionId, categoryId, sessionId],
    queryFn: async () => {
      if (!sectionId && !categoryId) return null;
      
      // Step 1: Get parent questions with audio_url from both sources
      let parentQuestions: DbQuestionSafe[] = [];
      
      if (sectionId) {
        const { data, error } = await supabase
          .from('questions_safe')
          .select('*')
          .eq('section_id', sectionId)
          .not('audio_url', 'is', null)
          .order('created_at', { ascending: true });
        if (!error && data) parentQuestions.push(...(data as DbQuestionSafe[]));
      }
      
      if (categoryId) {
        const { data, error } = await supabase
          .from('questions_safe')
          .select('*')
          .eq('category_id', categoryId)
          .not('audio_url', 'is', null)
          .order('created_at', { ascending: true });
        if (!error && data) {
          const existingIds = new Set(parentQuestions.map(q => q.id));
          for (const q of data as DbQuestionSafe[]) {
            if (!existingIds.has(q.id)) parentQuestions.push(q);
          }
        }
      }
      
      // Nhóm theo audio_url
      const examsByAudio = new Map<string, DbQuestionSafe[]>();
      
      for (const q of parentQuestions) {
        if (!q.audio_url) continue;
        if (!examsByAudio.has(q.audio_url)) {
          examsByAudio.set(q.audio_url, []);
        }
        examsByAudio.get(q.audio_url)!.push(q);
      }
      
      // Random chọn 1 audio
      const audioUrls = Array.from(examsByAudio.keys());
      if (audioUrls.length === 0) return null;
      
      const randomAudioUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
      const examParents = examsByAudio.get(randomAudioUrl)!;
      
      // Step 2: Fetch children (sub-questions) for these parents
      const parentIds = examParents.filter(q => !q.parent_id).map(q => q.id);
      let allQuestions = [...examParents];
      
      if (parentIds.length > 0) {
        const { data: childData, error: childError } = await supabase
          .from('questions_safe')
          .select('*')
          .in('parent_id', parentIds);
        
        if (!childError && childData) {
          allQuestions = [...allQuestions, ...(childData as DbQuestionSafe[])];
        }
      }
      
      // Nhóm câu hỏi cha con và giữ nguyên thứ tự
      const grouped = groupQuestionsWithChildrenSafe(allQuestions);
      
      const questionCount = grouped.reduce((total, q) => {
        if (q.subQuestions && q.subQuestions.length > 0) {
          return total + q.subQuestions.length;
        }
        return total + 1;
      }, 0);
      
      return {
        audioUrl: randomAudioUrl,
        questions: grouped,
        questionCount,
      } as ListeningExam;
    },
    enabled: (!!sectionId || !!categoryId) && enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

// Hook đếm số đề nghe theo category_id (đếm distinct audio_url)
// Hỗ trợ cả category_id trực tiếp và legacy bridge
export function useListeningExamCountByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['listening-exam-count', 'category', categoryId],
    queryFn: async () => {
      if (!categoryId) return 0;

      const allAudioUrls = new Set<string>();

      // Step 1: Đếm trực tiếp theo category_id
      const { data: directData, error: directError } = await supabase
        .from('questions_safe')
        .select('audio_url')
        .eq('category_id', categoryId)
        .not('audio_url', 'is', null)
        .is('parent_id', null);

      if (!directError && directData) {
        directData.forEach(q => { if (q.audio_url) allAudioUrls.add(q.audio_url); });
      }

      // Step 2: Legacy bridge (category → level → section)
      const { data: cat } = await supabase
        .from('categories')
        .select('subject_id, slug, parent_id')
        .eq('id', categoryId)
        .single();

      if (cat) {
        // Find root ancestor
        let rootSlug = cat.slug;
        let currentParentId = cat.parent_id;
        while (currentParentId) {
          const { data: parent } = await supabase
            .from('categories')
            .select('slug, parent_id')
            .eq('id', currentParentId)
            .single();
          if (!parent) break;
          rootSlug = parent.slug;
          currentParentId = parent.parent_id;
        }

        // Find legacy level
        const { data: level } = await supabase
          .from('levels')
          .select('id')
          .eq('subject_id', cat.subject_id)
          .eq('slug', rootSlug)
          .maybeSingle();

        // Find legacy section
        let sectionId: string | null = null;
        if (level) {
          const { data: section } = await supabase
            .from('sections')
            .select('id')
            .eq('level_id', level.id)
            .eq('slug', cat.slug)
            .maybeSingle();
          sectionId = section?.id ?? null;
        }

        if (sectionId) {
          const { data, error } = await supabase
            .from('questions_safe')
            .select('audio_url')
            .eq('section_id', sectionId)
            .not('audio_url', 'is', null);

          if (!error && data) {
            data.forEach(q => { if (q.audio_url) allAudioUrls.add(q.audio_url); });
          }
        }
      }

      return allAudioUrls.size;
    },
    enabled: !!categoryId,
  });
}
