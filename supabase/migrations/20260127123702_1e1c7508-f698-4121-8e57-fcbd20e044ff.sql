-- Drop and recreate the questions_safe view with SECURITY DEFINER
-- This is SAFE because the view explicitly excludes correct_option and explanation
-- The view allows authenticated users to see question content for taking quizzes

DROP VIEW IF EXISTS public.questions_safe;

CREATE VIEW public.questions_safe 
WITH (security_barrier = true)
AS
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
FROM public.questions;

-- Grant SELECT permission to authenticated and anon roles
GRANT SELECT ON public.questions_safe TO authenticated;
GRANT SELECT ON public.questions_safe TO anon;

-- Add a comment explaining the security design
COMMENT ON VIEW public.questions_safe IS 'Safe view of questions excluding correct_option and explanation. Intentionally accessible to all users for quiz-taking. Answers are validated server-side via submit_quiz_answers RPC function.';