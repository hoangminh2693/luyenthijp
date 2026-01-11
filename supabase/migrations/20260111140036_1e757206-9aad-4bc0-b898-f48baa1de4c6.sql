-- Thêm cột cho hình ảnh và âm thanh vào bảng questions
ALTER TABLE public.questions 
ADD COLUMN image_url TEXT,
ADD COLUMN audio_url TEXT;

-- Thêm cột parent_id để hỗ trợ câu hỏi có nhiều phần nhỏ
-- Câu hỏi cha (đề bài chung) sẽ có parent_id = NULL
-- Câu hỏi con sẽ có parent_id trỏ về câu hỏi cha
ALTER TABLE public.questions 
ADD COLUMN parent_id UUID REFERENCES public.questions(id) ON DELETE CASCADE;

-- Thêm index cho parent_id để tăng tốc query
CREATE INDEX idx_questions_parent_id ON public.questions(parent_id);

-- Comment giải thích cấu trúc
COMMENT ON COLUMN public.questions.image_url IS 'URL hình ảnh đính kèm câu hỏi';
COMMENT ON COLUMN public.questions.audio_url IS 'URL file âm thanh đính kèm câu hỏi';
COMMENT ON COLUMN public.questions.parent_id IS 'ID câu hỏi cha - dùng cho đề bài có nhiều câu hỏi con';