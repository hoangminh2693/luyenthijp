-- Drop and recreate the leaderboard_stats view with proper security settings
-- This view aggregates public leaderboard data without exposing sensitive information

DROP VIEW IF EXISTS public.leaderboard_stats;

CREATE VIEW public.leaderboard_stats
WITH (security_invoker = false, security_barrier = true)
AS
SELECT 
    qh.user_id,
    s.level_id,
    (count(*))::integer AS total_attempts,
    (count(*) FILTER (WHERE (qh.is_correct = true)))::integer AS correct_count,
    (count(DISTINCT
        CASE
            WHEN qh.is_correct THEN COALESCE(q.parent_id, q.id)
            ELSE NULL::uuid
        END))::integer AS distinct_correct,
    (count(*) FILTER (WHERE (qh.answered_at >= (now() - '7 days'::interval))))::integer AS attempts_this_week,
    (count(*) FILTER (WHERE ((qh.is_correct = true) AND (qh.answered_at >= (now() - '7 days'::interval)))))::integer AS correct_this_week,
    (count(*) FILTER (WHERE (qh.answered_at >= date_trunc('month'::text, now()))))::integer AS attempts_this_month,
    (count(*) FILTER (WHERE ((qh.is_correct = true) AND (qh.answered_at >= date_trunc('month'::text, now())))))::integer AS correct_this_month
FROM ((question_history qh
    JOIN questions q ON ((q.id = qh.question_id)))
    JOIN sections s ON ((s.id = q.section_id)))
WHERE (qh.user_id IS NOT NULL)
GROUP BY qh.user_id, s.level_id;

-- Grant SELECT permission for authenticated users to view leaderboard stats
GRANT SELECT ON public.leaderboard_stats TO authenticated;
GRANT SELECT ON public.leaderboard_stats TO anon;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.leaderboard_stats IS 'Aggregated leaderboard statistics for public ranking display. Contains only aggregate performance metrics (counts) without exposing individual question answers or detailed history.';