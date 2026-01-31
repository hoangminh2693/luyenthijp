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
    C?: string; // Nullable cho câu 3 đáp án
    D?: string; // Nullable cho câu 3 đáp án
  };
  correctOption?: 'A' | 'B' | 'C' | 'D'; // Optional - only available after submission
  explanation?: string; // Optional - only available after submission
  section_id: string;
  image_url?: string;
  audio_url?: string;
  parent_id?: string;
  subQuestions?: Question[]; // Câu hỏi con
  // Thông tin loại câu hỏi nghe
  questionType?: ListeningQuestionType;
  optionCount?: number; // Số lượng đáp án (2-4)
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
    // correctOption and explanation NOT included - revealed only after submission
    section_id: dbQuestion.section_id,
    image_url: dbQuestion.image_url || undefined,
    audio_url: dbQuestion.audio_url || undefined,
    parent_id: dbQuestion.parent_id || undefined,
    questionType: dbQuestion.question_type || 'standard',
    optionCount: optionCount,
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

// Nhóm câu hỏi cha với câu hỏi con (safe version)
function groupQuestionsWithChildrenSafe(questions: DbQuestionSafe[]): Question[] {
  const parentQuestions = questions.filter(q => !q.parent_id);
  const childQuestions = questions.filter(q => q.parent_id);
  
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

// Hook lấy câu hỏi ngẫu nhiên từ section (SECURE - không có đáp án)
export function useRandomQuestions(sectionId: string | undefined, count: number) {
  return useQuery({
    queryKey: ['questions', 'random', sectionId, count],
    queryFn: async () => {
      if (!sectionId) return [];
      
      // Use the SAFE view that excludes correct_option and explanation
      const { data, error } = await supabase
        .from('questions_safe')
        .select('*')
        .eq('section_id', sectionId);
      
      if (error) throw error;
      
      // Nhóm câu hỏi cha với câu con
      const grouped = groupQuestionsWithChildrenSafe(data as DbQuestionSafe[] || []);
      
      // Shuffle và lấy số lượng câu cha cần thiết
      const shuffled = [...grouped].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, shuffled.length));
    },
    enabled: !!sectionId && count > 0,
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
export function useListeningExams(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['listening-exams', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      
      // Lấy tất cả câu hỏi có audio_url từ section này
      const { data, error } = await supabase
        .from('questions_safe')
        .select('*')
        .eq('section_id', sectionId)
        .not('audio_url', 'is', null);
      
      if (error) throw error;
      
      const questions = data as DbQuestionSafe[] || [];
      
      // Nhóm theo audio_url - mỗi audio = 1 đề nghe
      const examsByAudio = new Map<string, DbQuestionSafe[]>();
      
      for (const q of questions) {
        if (!q.audio_url) continue;
        
        if (!examsByAudio.has(q.audio_url)) {
          examsByAudio.set(q.audio_url, []);
        }
        examsByAudio.get(q.audio_url)!.push(q);
      }
      
      // Chuyển đổi thành mảng ListeningExam
      const exams: ListeningExam[] = [];
      
      for (const [audioUrl, examQuestions] of examsByAudio) {
        const grouped = groupQuestionsWithChildrenSafe(examQuestions);
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
    enabled: !!sectionId,
  });
}

// Hook lấy 1 đề nghe ngẫu nhiên cho phần 聴解
export function useRandomListeningExam(sectionId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['listening-exam', 'random', sectionId],
    queryFn: async () => {
      if (!sectionId) return null;
      
      // Lấy tất cả câu hỏi có audio_url từ section này
      const { data, error } = await supabase
        .from('questions_safe')
        .select('*')
        .eq('section_id', sectionId)
        .not('audio_url', 'is', null);
      
      if (error) throw error;
      
      const questions = data as DbQuestionSafe[] || [];
      
      // Nhóm theo audio_url
      const examsByAudio = new Map<string, DbQuestionSafe[]>();
      
      for (const q of questions) {
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
      const examQuestions = examsByAudio.get(randomAudioUrl)!;
      
      // Nhóm câu hỏi cha con và giữ nguyên thứ tự (không shuffle cho phần nghe)
      const grouped = groupQuestionsWithChildrenSafe(examQuestions);
      
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
    enabled: !!sectionId && enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
