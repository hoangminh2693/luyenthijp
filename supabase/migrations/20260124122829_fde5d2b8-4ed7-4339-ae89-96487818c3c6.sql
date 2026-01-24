-- 1. Create a secure view for questions that hides answers (for quiz taking)
CREATE VIEW public.questions_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  section_id,
  created_at,
  parent_id,
  content,
  option_a,
  option_b,
  option_c,
  option_d,
  image_url,
  audio_url
  -- Excludes: correct_option, explanation (sensitive answer data)
FROM public.questions;

-- 2. Update RLS policy for questions table - restrict SELECT to admins only
-- First drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read questions" ON public.questions;

-- Create new restrictive SELECT policy - only admins can directly access the questions table
CREATE POLICY "Only admins can read questions directly"
ON public.questions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Enable RLS on leaderboard_stats view (it's a view, so we need to make sure it's secure)
-- The view already has security_invoker=on, which means it respects the RLS of underlying tables
-- But we should add explicit policies for the view for clarity

-- 4. Create a function to submit quiz answers and get results securely
CREATE OR REPLACE FUNCTION public.submit_quiz_answers(
  p_answers jsonb -- Array of {question_id: uuid, selected_answer: text}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_answer jsonb;
  v_question record;
  v_results jsonb := '[]'::jsonb;
  v_correct_count int := 0;
  v_total_count int := 0;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Process each answer
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    -- Get the question with correct answer (only accessible here in SECURITY DEFINER context)
    SELECT id, correct_option, explanation
    INTO v_question
    FROM public.questions
    WHERE id = (v_answer->>'question_id')::uuid;

    IF v_question.id IS NOT NULL THEN
      v_total_count := v_total_count + 1;
      
      -- Check if answer is correct
      IF v_answer->>'selected_answer' = v_question.correct_option THEN
        v_correct_count := v_correct_count + 1;
      END IF;

      -- Save to question_history
      INSERT INTO public.question_history (
        question_id,
        user_id,
        selected_answer,
        is_correct
      ) VALUES (
        v_question.id,
        v_user_id,
        v_answer->>'selected_answer',
        v_answer->>'selected_answer' = v_question.correct_option
      );

      -- Add result with correct answer and explanation (revealed after submission)
      v_results := v_results || jsonb_build_object(
        'question_id', v_question.id,
        'selected_answer', v_answer->>'selected_answer',
        'correct_option', v_question.correct_option,
        'explanation', v_question.explanation,
        'is_correct', v_answer->>'selected_answer' = v_question.correct_option
      );
    END IF;
  END LOOP;

  -- Return results
  RETURN jsonb_build_object(
    'total_questions', v_total_count,
    'correct_answers', v_correct_count,
    'wrong_answers', v_total_count - v_correct_count,
    'percentage', CASE WHEN v_total_count > 0 THEN ROUND((v_correct_count::numeric / v_total_count) * 100) ELSE 0 END,
    'details', v_results
  );
END;
$$;