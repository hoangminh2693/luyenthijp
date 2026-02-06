CREATE OR REPLACE FUNCTION public.get_question_count_by_category(p_category_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_id uuid;
  v_category_slug text;
  v_root_slug text;
  v_root_name text;
  v_level_id uuid;
  v_section_id uuid;
  v_count integer := 0;
BEGIN
  -- Basic category info
  SELECT subject_id, slug
  INTO v_subject_id, v_category_slug
  FROM categories
  WHERE id = p_category_id;

  IF v_subject_id IS NULL OR v_category_slug IS NULL THEN
    RETURN 0;
  END IF;

  -- Find root ancestor (parent_id is null) to map to legacy level (JLPT: N1..N5)
  WITH RECURSIVE ancestors AS (
    SELECT c.id, c.parent_id, c.slug, c.name
    FROM categories c
    WHERE c.id = p_category_id

    UNION ALL

    SELECT p.id, p.parent_id, p.slug, p.name
    FROM categories p
    JOIN ancestors a ON a.parent_id = p.id
  )
  SELECT a.slug, a.name
  INTO v_root_slug, v_root_name
  FROM ancestors a
  WHERE a.parent_id IS NULL
  LIMIT 1;

  -- Try resolve legacy level by subject_id + root slug/name
  IF v_root_slug IS NOT NULL OR v_root_name IS NOT NULL THEN
    SELECT id
    INTO v_level_id
    FROM levels
    WHERE subject_id = v_subject_id
      AND (
        (v_root_slug IS NOT NULL AND slug = v_root_slug)
        OR (v_root_name IS NOT NULL AND name = v_root_name)
      )
    LIMIT 1;
  END IF;

  -- Resolve legacy section as strictly as possible
  IF v_level_id IS NOT NULL THEN
    SELECT id
    INTO v_section_id
    FROM sections
    WHERE level_id = v_level_id
      AND slug = v_category_slug
    LIMIT 1;
  ELSE
    -- If subject doesn't use levels (or can't map), match section by subject only
    SELECT s.id
    INTO v_section_id
    FROM sections s
    JOIN levels l ON l.id = s.level_id
    WHERE s.slug = v_category_slug
      AND l.subject_id = v_subject_id
    LIMIT 1;
  END IF;

  -- Count parent questions (avoid counting sub-questions)
  IF v_section_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_count
    FROM questions
    WHERE section_id = v_section_id
      AND parent_id IS NULL;
  ELSE
    SELECT COUNT(*)
    INTO v_count
    FROM questions
    WHERE category_id = p_category_id
      AND parent_id IS NULL;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_count_by_category(uuid) TO anon, authenticated;
