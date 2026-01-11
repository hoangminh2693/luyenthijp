import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Question {
  id: string;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  section_id: string;
  image_url?: string;
  audio_url?: string;
  parent_id?: string;
  subQuestions?: Question[]; // Câu hỏi con
}

interface DbQuestion {
  id: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  section_id: string;
  image_url: string | null;
  audio_url: string | null;
  parent_id: string | null;
}

// Chuyển đổi dữ liệu từ database sang format Question
function mapDbQuestion(dbQuestion: DbQuestion): Question {
  return {
    id: dbQuestion.id,
    content: dbQuestion.content,
    options: {
      A: dbQuestion.option_a,
      B: dbQuestion.option_b,
      C: dbQuestion.option_c,
      D: dbQuestion.option_d,
    },
    correctOption: dbQuestion.correct_option as 'A' | 'B' | 'C' | 'D',
    explanation: dbQuestion.explanation || undefined,
    section_id: dbQuestion.section_id,
    image_url: dbQuestion.image_url || undefined,
    audio_url: dbQuestion.audio_url || undefined,
    parent_id: dbQuestion.parent_id || undefined,
  };
}

// Nhóm câu hỏi cha với câu hỏi con
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

// Hook lấy câu hỏi theo section_id
export function useQuestionsBySection(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'section', sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      
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

// Hook lấy câu hỏi ngẫu nhiên từ section (chỉ lấy câu cha, kèm câu con)
export function useRandomQuestions(sectionId: string | undefined, count: number) {
  return useQuery({
    queryKey: ['questions', 'random', sectionId, count],
    queryFn: async () => {
      if (!sectionId) return [];
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('section_id', sectionId);
      
      if (error) throw error;
      
      // Nhóm câu hỏi cha với câu con
      const grouped = groupQuestionsWithChildren(data as DbQuestion[] || []);
      
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
      
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', sectionId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!sectionId,
  });
}
