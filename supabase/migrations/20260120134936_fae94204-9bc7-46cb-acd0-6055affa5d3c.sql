
-- Fix Security Definer View warning for leaderboard_stats
-- Recreate the view with security_invoker=on to use invoker's permissions

-- First drop the existing view
DROP VIEW IF EXISTS public.leaderboard_stats;

-- Recreate with security_invoker=on
CREATE VIEW public.leaderboard_stats
WITH (security_invoker = on) AS
SELECT 
  qh.user_id,
  s.level_id,
  COUNT(*)::integer AS total_attempts,
  COUNT(*) FILTER (WHERE qh.is_correct = true)::integer AS correct_count,
  COUNT(DISTINCT 
    CASE WHEN qh.is_correct THEN COALESCE(q.parent_id, q.id) 
    ELSE NULL 
    END
  )::integer AS distinct_correct,
  COUNT(*) FILTER (WHERE qh.answered_at >= (now() - INTERVAL '7 days'))::integer AS attempts_this_week,
  COUNT(*) FILTER (WHERE qh.is_correct = true AND qh.answered_at >= (now() - INTERVAL '7 days'))::integer AS correct_this_week,
  COUNT(*) FILTER (WHERE qh.answered_at >= date_trunc('month', now()))::integer AS attempts_this_month,
  COUNT(*) FILTER (WHERE qh.is_correct = true AND qh.answered_at >= date_trunc('month', now()))::integer AS correct_this_month
FROM public.question_history qh
JOIN public.questions q ON q.id = qh.question_id
JOIN public.sections s ON s.id = q.section_id
WHERE qh.user_id IS NOT NULL
GROUP BY qh.user_id, s.level_id;

-- Re-grant permissions to authenticated and anon users
GRANT SELECT ON public.leaderboard_stats TO authenticated;
GRANT SELECT ON public.leaderboard_stats TO anon;
