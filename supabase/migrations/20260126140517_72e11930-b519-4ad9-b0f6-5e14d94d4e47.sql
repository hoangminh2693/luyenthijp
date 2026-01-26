-- Thêm các cột cấu hình cho sections để linh hoạt hóa logic làm bài
-- Mặc định: cho phép random và chọn số lượng (phù hợp với 文字・語彙, 文法, 読解)
-- Phần 聴解 sẽ được cập nhật với fixed_exam_mode = true

ALTER TABLE public.sections 
ADD COLUMN allow_random BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN allow_count_selection BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN fixed_exam_mode BOOLEAN NOT NULL DEFAULT false;

-- Comment giải thích các cột mới
COMMENT ON COLUMN public.sections.allow_random IS 'Cho phép random câu hỏi (true cho 文字・語彙, 文法, 読解)';
COMMENT ON COLUMN public.sections.allow_count_selection IS 'Cho phép chọn số lượng câu hỏi (true cho 文字・語彙, 文法, 読解)';
COMMENT ON COLUMN public.sections.fixed_exam_mode IS 'Làm bài theo đề cố định - 1 audio = 1 đề (true cho 聴解)';

-- Cập nhật các section 聴解 (choukai) hiện có thành fixed_exam_mode
UPDATE public.sections 
SET 
  allow_random = false,
  allow_count_selection = false,
  fixed_exam_mode = true
WHERE slug = 'choukai';