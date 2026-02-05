-- Cập nhật view questions_safe để thêm category_id (cho phép đếm câu hỏi theo category)
DROP VIEW IF EXISTS public.questions_safe;

CREATE VIEW public.questions_safe
WITH (security_barrier = true, security_invoker = false)
AS
SELECT 
  id,
  section_id,
  category_id,  -- Thêm cột này để hỗ trợ đếm câu hỏi theo category
  created_at,
  parent_id,
  question_type,
  option_count,
  content,
  option_a,
  option_b,
  option_c,
  option_d,
  image_url,
  audio_url
  -- KHÔNG bao gồm: correct_option, explanation (bảo mật đáp án)
FROM public.questions;

-- Cấp quyền SELECT cho tất cả (anon và authenticated)
GRANT SELECT ON public.questions_safe TO anon, authenticated;