
-- Allow questions to exist without a legacy section_id (for new layer-based subjects like BJT)
ALTER TABLE public.questions ALTER COLUMN section_id DROP NOT NULL;

-- Recreate the questions_safe view with same column order
DROP VIEW IF EXISTS public.questions_safe;
CREATE VIEW public.questions_safe WITH (security_barrier = true, security_invoker = false) AS
SELECT 
  id, section_id, category_id, content, option_a, option_b, option_c, option_d, 
  image_url, audio_url, created_at, parent_id,
  question_type, option_count, mondai_index, mondai_title
FROM public.questions;

-- Grant access
GRANT SELECT ON public.questions_safe TO anon, authenticated;
