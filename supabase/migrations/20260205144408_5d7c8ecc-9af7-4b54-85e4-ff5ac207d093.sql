-- Tạo function đếm câu hỏi theo category với fallback về section tương ứng
-- Điều này giải quyết vấn đề khi một số câu hỏi có section_id nhưng chưa có category_id

CREATE OR REPLACE FUNCTION public.get_question_count_by_category(p_category_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_section_id uuid;
  v_category_name text;
  v_parent_name text;
BEGIN
  -- Lấy thông tin category và parent
  SELECT c.name, pc.name
  INTO v_category_name, v_parent_name
  FROM categories c
  LEFT JOIN categories pc ON pc.id = c.parent_id
  WHERE c.id = p_category_id;
  
  -- Nếu không tìm thấy category, return 0
  IF v_category_name IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Tìm section tương ứng (cùng tên với category, level có tên = parent category)
  SELECT s.id INTO v_section_id
  FROM sections s
  JOIN levels l ON l.id = s.level_id
  WHERE s.name = v_category_name
    AND l.name = v_parent_name;
  
  -- Đếm câu hỏi từ section (nếu tìm thấy) - chỉ đếm câu cha
  IF v_section_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM questions
    WHERE section_id = v_section_id
      AND parent_id IS NULL;
  ELSE
    -- Fallback: đếm từ category_id trực tiếp
    SELECT COUNT(*) INTO v_count
    FROM questions
    WHERE category_id = p_category_id
      AND parent_id IS NULL;
  END IF;
  
  RETURN v_count;
END;
$$;

-- Grant execute cho tất cả users
GRANT EXECUTE ON FUNCTION public.get_question_count_by_category(uuid) TO anon, authenticated;