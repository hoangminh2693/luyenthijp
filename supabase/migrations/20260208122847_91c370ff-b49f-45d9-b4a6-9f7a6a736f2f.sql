
-- Add mondai grouping columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS mondai_index integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mondai_title text DEFAULT NULL;

-- Drop and recreate the safe view with new columns
DROP VIEW IF EXISTS public.questions_safe;

CREATE VIEW public.questions_safe 
WITH (security_barrier = true, security_invoker = false) AS
SELECT 
  id,
  section_id,
  category_id,
  content,
  option_a,
  option_b,
  option_c,
  option_d,
  image_url,
  audio_url,
  created_at,
  parent_id,
  question_type,
  option_count,
  mondai_index,
  mondai_title
FROM public.questions;
