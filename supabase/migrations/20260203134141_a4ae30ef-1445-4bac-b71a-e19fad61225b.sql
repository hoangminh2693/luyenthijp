-- =====================================================
-- FLEXIBLE LAYER-BASED SUBJECT CLASSIFICATION SYSTEM
-- =====================================================

-- 1. Create subject_layers table (định nghĩa các layer cho mỗi môn)
CREATE TABLE public.subject_layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- VD: "Cấp độ", "Kỹ năng", "Phần thi"
  slug TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,  -- Layer 1, 2, 3...
  required BOOLEAN NOT NULL DEFAULT true,  -- Bắt buộc chọn?
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: mỗi môn không có layer trùng slug
  UNIQUE(subject_id, slug)
);

-- 2. Create categories table (thay thế levels + sections)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  layer_id UUID NOT NULL REFERENCES public.subject_layers(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,  -- Cho nested categories
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  
  -- Cấu hình logic làm bài (kế thừa từ sections)
  allow_random BOOLEAN NOT NULL DEFAULT true,
  allow_count_selection BOOLEAN NOT NULL DEFAULT true,
  fixed_exam_mode BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: slug unique trong cùng layer và parent
  UNIQUE(layer_id, parent_id, slug)
);

-- 3. Add category_id to questions table (mới)
ALTER TABLE public.questions 
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- 4. Enable RLS
ALTER TABLE public.subject_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for subject_layers
CREATE POLICY "Anyone can read subject_layers"
ON public.subject_layers FOR SELECT
USING (true);

CREATE POLICY "Admins can insert subject_layers"
ON public.subject_layers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subject_layers"
ON public.subject_layers FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subject_layers"
ON public.subject_layers FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. RLS Policies for categories
CREATE POLICY "Anyone can read categories"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Create indexes for performance
CREATE INDEX idx_subject_layers_subject ON public.subject_layers(subject_id);
CREATE INDEX idx_categories_subject ON public.categories(subject_id);
CREATE INDEX idx_categories_layer ON public.categories(layer_id);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_questions_category ON public.questions(category_id);

-- =====================================================
-- AUTO-MIGRATE DATA FROM levels/sections
-- =====================================================

-- 8. Migrate JLPT data (assuming subject exists)
DO $$
DECLARE
  v_jlpt_id UUID;
  v_layer1_id UUID;
  v_layer2_id UUID;
  v_level RECORD;
  v_section RECORD;
  v_category_id UUID;
  v_parent_category_id UUID;
BEGIN
  -- Find JLPT subject
  SELECT id INTO v_jlpt_id FROM public.subjects WHERE slug = 'jlpt' LIMIT 1;
  
  IF v_jlpt_id IS NOT NULL THEN
    -- Create Layer 1: Cấp độ
    INSERT INTO public.subject_layers (subject_id, name, slug, order_index, required)
    VALUES (v_jlpt_id, 'Cấp độ', 'cap-do', 0, true)
    RETURNING id INTO v_layer1_id;
    
    -- Create Layer 2: Kỹ năng
    INSERT INTO public.subject_layers (subject_id, name, slug, order_index, required)
    VALUES (v_jlpt_id, 'Kỹ năng', 'ky-nang', 1, true)
    RETURNING id INTO v_layer2_id;
    
    -- Migrate levels → categories (Layer 1)
    FOR v_level IN 
      SELECT * FROM public.levels WHERE subject_id = v_jlpt_id ORDER BY order_index
    LOOP
      INSERT INTO public.categories (
        subject_id, layer_id, parent_id, name, slug, icon, description, order_index
      ) VALUES (
        v_jlpt_id, v_layer1_id, NULL, v_level.name, v_level.slug, 
        v_level.icon, v_level.description, COALESCE(v_level.order_index, 0)
      ) RETURNING id INTO v_parent_category_id;
      
      -- Migrate sections → categories (Layer 2) with parent
      FOR v_section IN 
        SELECT * FROM public.sections WHERE level_id = v_level.id ORDER BY order_index
      LOOP
        INSERT INTO public.categories (
          subject_id, layer_id, parent_id, name, slug, icon, description, order_index,
          allow_random, allow_count_selection, fixed_exam_mode
        ) VALUES (
          v_jlpt_id, v_layer2_id, v_parent_category_id, v_section.name, v_section.slug,
          v_section.icon, v_section.description, COALESCE(v_section.order_index, 0),
          v_section.allow_random, v_section.allow_count_selection, v_section.fixed_exam_mode
        ) RETURNING id INTO v_category_id;
        
        -- Update questions to point to new category
        UPDATE public.questions 
        SET category_id = v_category_id 
        WHERE section_id = v_section.id;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- 9. Migrate any other subjects that have levels/sections
DO $$
DECLARE
  v_subject RECORD;
  v_layer1_id UUID;
  v_layer2_id UUID;
  v_level RECORD;
  v_section RECORD;
  v_category_id UUID;
  v_parent_category_id UUID;
BEGIN
  -- Process all subjects except JLPT (already done)
  FOR v_subject IN 
    SELECT * FROM public.subjects WHERE slug != 'jlpt' AND has_levels = true
  LOOP
    -- Check if this subject has levels
    IF EXISTS (SELECT 1 FROM public.levels WHERE subject_id = v_subject.id) THEN
      -- Create Layer 1
      INSERT INTO public.subject_layers (subject_id, name, slug, order_index, required)
      VALUES (v_subject.id, 'Phân loại', 'phan-loai', 0, true)
      RETURNING id INTO v_layer1_id;
      
      -- Check if any level has sections
      IF EXISTS (
        SELECT 1 FROM public.sections s 
        JOIN public.levels l ON l.id = s.level_id 
        WHERE l.subject_id = v_subject.id
      ) THEN
        -- Create Layer 2
        INSERT INTO public.subject_layers (subject_id, name, slug, order_index, required)
        VALUES (v_subject.id, 'Phần', 'phan', 1, true)
        RETURNING id INTO v_layer2_id;
      END IF;
      
      -- Migrate levels
      FOR v_level IN 
        SELECT * FROM public.levels WHERE subject_id = v_subject.id ORDER BY order_index
      LOOP
        INSERT INTO public.categories (
          subject_id, layer_id, parent_id, name, slug, icon, description, order_index
        ) VALUES (
          v_subject.id, v_layer1_id, NULL, v_level.name, v_level.slug, 
          v_level.icon, v_level.description, COALESCE(v_level.order_index, 0)
        ) RETURNING id INTO v_parent_category_id;
        
        -- Migrate sections if layer2 exists
        IF v_layer2_id IS NOT NULL THEN
          FOR v_section IN 
            SELECT * FROM public.sections WHERE level_id = v_level.id ORDER BY order_index
          LOOP
            INSERT INTO public.categories (
              subject_id, layer_id, parent_id, name, slug, icon, description, order_index,
              allow_random, allow_count_selection, fixed_exam_mode
            ) VALUES (
              v_subject.id, v_layer2_id, v_parent_category_id, v_section.name, v_section.slug,
              v_section.icon, v_section.description, COALESCE(v_section.order_index, 0),
              v_section.allow_random, v_section.allow_count_selection, v_section.fixed_exam_mode
            ) RETURNING id INTO v_category_id;
            
            -- Update questions
            UPDATE public.questions 
            SET category_id = v_category_id 
            WHERE section_id = v_section.id;
          END LOOP;
        ELSE
          -- If no Layer 2, questions should point to parent category
          -- This handles subjects with only levels, no sections
          UPDATE public.questions q
          SET category_id = v_parent_category_id
          FROM public.sections s
          WHERE s.level_id = v_level.id AND q.section_id = s.id;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;