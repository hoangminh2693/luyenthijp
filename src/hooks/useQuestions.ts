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
}

// Chuyển đổi dữ liệu từ database sang format Question
function mapDbQuestion(dbQuestion: {
  id: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  section_id: string;
}): Question {
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
  };
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

// Hook lấy câu hỏi ngẫu nhiên từ section
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
      
      // Shuffle và lấy số lượng cần thiết
      const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, shuffled.length)).map(mapDbQuestion);
    },
    enabled: !!sectionId && count > 0,
    staleTime: Infinity, // Không bao giờ coi là stale
    gcTime: 1000 * 60 * 30, // Giữ cache 30 phút
    refetchOnWindowFocus: false, // Không refetch khi chuyển tab
    refetchOnMount: false, // Không refetch khi component mount lại
    refetchOnReconnect: false, // Không refetch khi reconnect
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
