-- =====================================================
-- LISTENING QUESTION TYPE SUPPORT FOR JLPT FORMAT
-- =====================================================

-- 1. Tạo enum cho loại câu hỏi nghe
CREATE TYPE public.listening_question_type AS ENUM (
  'standard',     -- Câu hỏi thông thường: hiển thị đầy đủ nội dung + 4 đáp án
  'audio_only',   -- TYPE_B: Câu hỏi và đáp án trong audio, chỉ hiển thị ①②③④
  'image_based'   -- TYPE_C: Câu hỏi với hình ảnh, chọn theo hình
);

-- 2. Thêm cột mới vào bảng questions
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS question_type public.listening_question_type DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS option_count integer DEFAULT 4;

-- 3. Cho phép option_c và option_d là nullable (cho câu 3 đáp án)
ALTER TABLE public.questions 
  ALTER COLUMN option_c DROP NOT NULL,
  ALTER COLUMN option_d DROP NOT NULL;

-- 4. Thêm constraint kiểm tra option_count hợp lệ (2-4)
ALTER TABLE public.questions 
  ADD CONSTRAINT valid_option_count CHECK (option_count >= 2 AND option_count <= 4);

-- 5. Cập nhật view questions_safe để bao gồm các cột mới
DROP VIEW IF EXISTS public.questions_safe;

CREATE VIEW public.questions_safe
WITH (security_invoker = false, security_barrier = true)
AS
SELECT 
  id,
  section_id,
  created_at,
  parent_id,
  image_url,
  audio_url,
  content,
  option_a,
  option_b,
  option_c,
  option_d,
  question_type,
  option_count
FROM public.questions;

-- 6. Cấp quyền truy cập view cho anon và authenticated
GRANT SELECT ON public.questions_safe TO anon;
GRANT SELECT ON public.questions_safe TO authenticated;

-- 7. Comment giải thích các loại câu hỏi
COMMENT ON COLUMN public.questions.question_type IS 
  'Loại câu hỏi: standard (đầy đủ text), audio_only (chỉ số thứ tự ①②③④), image_based (chọn theo hình)';

COMMENT ON COLUMN public.questions.option_count IS 
  'Số lượng đáp án (2-4). Mặc định 4. Cho phép linh hoạt theo format JLPT';