
-- RPC for guest users: check answers without saving to DB
CREATE OR REPLACE FUNCTION public.check_quiz_answers(p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_answer jsonb;
  v_question record;
  v_results jsonb := '[]'::jsonb;
  v_correct_count int := 0;
  v_total_count int := 0;
BEGIN
  -- Process each answer (NO auth required, NO history saved)
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    SELECT id, correct_option, explanation
    INTO v_question
    FROM public.questions
    WHERE id = (v_answer->>'question_id')::uuid;

    IF v_question.id IS NOT NULL THEN
      v_total_count := v_total_count + 1;
      
      IF v_answer->>'selected_answer' = v_question.correct_option THEN
        v_correct_count := v_correct_count + 1;
      END IF;

      -- Return result WITHOUT explanation for guests
      v_results := v_results || jsonb_build_object(
        'question_id', v_question.id,
        'selected_answer', v_answer->>'selected_answer',
        'correct_option', v_question.correct_option,
        'explanation', v_question.explanation,
        'is_correct', v_answer->>'selected_answer' = v_question.correct_option
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_questions', v_total_count,
    'correct_answers', v_correct_count,
    'wrong_answers', v_total_count - v_correct_count,
    'percentage', CASE WHEN v_total_count > 0 THEN ROUND((v_correct_count::numeric / v_total_count) * 100) ELSE 0 END,
    'details', v_results
  );
END;
$function$;
