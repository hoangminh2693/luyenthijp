import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Section {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  level_id: string;
  order_index: number | null;
  // Cấu hình logic làm bài - cho phép mở rộng linh hoạt cho các môn học khác
  allow_random: boolean;
  allow_count_selection: boolean;
  fixed_exam_mode: boolean;
}

export interface Level {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  subject_id: string | null;
  order_index: number | null;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  has_levels: boolean;
}

// Hook lấy section theo slug và level_id
export function useSectionBySlug(levelId: string | undefined, sectionSlug: string | undefined) {
  return useQuery({
    queryKey: ['section', levelId, sectionSlug],
    queryFn: async () => {
      if (!levelId || !sectionSlug) return null;
      
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('level_id', levelId)
        .eq('slug', sectionSlug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Section | null;
    },
    enabled: !!levelId && !!sectionSlug,
  });
}

// Hook lấy level theo slug và subject_id
export function useLevelBySlug(subjectId: string | undefined, levelSlug: string | undefined) {
  return useQuery({
    queryKey: ['level', subjectId, levelSlug],
    queryFn: async () => {
      if (!subjectId || !levelSlug) return null;
      
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('slug', levelSlug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Level | null;
    },
    enabled: !!subjectId && !!levelSlug,
  });
}

// Hook lấy subject theo slug
export function useSubjectBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['subject', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Subject | null;
    },
    enabled: !!slug,
  });
}
