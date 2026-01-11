-- Tạo storage bucket cho media câu hỏi
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-media', 'question-media', true);

-- Policy cho phép ai cũng đọc được
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-media');

-- Policy cho phép admin upload
CREATE POLICY "Admin can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-media' AND has_role(auth.uid(), 'admin'::app_role));

-- Policy cho phép admin xóa
CREATE POLICY "Admin can delete media"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-media' AND has_role(auth.uid(), 'admin'::app_role));

-- Policy cho phép admin update
CREATE POLICY "Admin can update media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'question-media' AND has_role(auth.uid(), 'admin'::app_role));