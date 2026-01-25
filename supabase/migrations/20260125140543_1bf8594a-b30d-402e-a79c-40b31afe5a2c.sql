-- Create view for fast progress calculation (improvement in last 7/30 days)
-- This view calculates user performance improvement over time

CREATE OR REPLACE FUNCTION public.get_enhanced_leaderboard(
  p_level_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_time_range text DEFAULT 'all',
  p_leaderboard_type text DEFAULT 'overall' -- 'overall', 'accuracy', 'diligent', 'progress'
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  level_id uuid,
  level_name text,
  level_order_index integer,
  total_attempts bigint,
  correct_count bigint,
  distinct_correct bigint,
  total_questions_in_level bigint,
  accuracy_percent numeric,
  ranking_score numeric,
  streak_days integer,
  improvement_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH question_counts AS (
    SELECT 
      sec.level_id,
      COUNT(*)::bigint as total_questions
    FROM questions q
    INNER JOIN sections sec ON sec.id = q.section_id
    WHERE q.parent_id IS NULL
    GROUP BY sec.level_id
  ),
  user_stats AS (
    SELECT 
      qh.user_id,
      sec.level_id,
      -- Total attempts based on time range
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(*) FILTER (WHERE qh.answered_at >= NOW() - INTERVAL '7 days')
        WHEN p_time_range = 'month' THEN COUNT(*) FILTER (WHERE qh.answered_at >= DATE_TRUNC('month', NOW()))
        ELSE COUNT(*)
      END as total_attempts,
      -- Correct count based on time range
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(*) FILTER (WHERE qh.is_correct = true AND qh.answered_at >= NOW() - INTERVAL '7 days')
        WHEN p_time_range = 'month' THEN COUNT(*) FILTER (WHERE qh.is_correct = true AND qh.answered_at >= DATE_TRUNC('month', NOW()))
        ELSE COUNT(*) FILTER (WHERE qh.is_correct = true)
      END as correct_count,
      -- Distinct correct questions
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(DISTINCT CASE WHEN qh.is_correct AND qh.answered_at >= NOW() - INTERVAL '7 days' THEN COALESCE(q.parent_id, q.id) END)
        WHEN p_time_range = 'month' THEN COUNT(DISTINCT CASE WHEN qh.is_correct AND qh.answered_at >= DATE_TRUNC('month', NOW()) THEN COALESCE(q.parent_id, q.id) END)
        ELSE COUNT(DISTINCT CASE WHEN qh.is_correct THEN COALESCE(q.parent_id, q.id) END)
      END as distinct_correct,
      -- Calculate streak (consecutive days of practice)
      (
        SELECT COUNT(DISTINCT DATE(answered_at))::integer
        FROM question_history qh2
        WHERE qh2.user_id = qh.user_id
        AND qh2.answered_at >= NOW() - INTERVAL '30 days'
      ) as activity_days
    FROM question_history qh
    INNER JOIN questions q ON q.id = qh.question_id
    INNER JOIN sections sec ON sec.id = q.section_id
    INNER JOIN levels l ON l.id = sec.level_id
    WHERE qh.user_id IS NOT NULL
      AND (p_level_id IS NULL OR sec.level_id = p_level_id)
      AND (p_subject_id IS NULL OR l.subject_id = p_subject_id)
    GROUP BY qh.user_id, sec.level_id
    HAVING (
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(*) FILTER (WHERE qh.answered_at >= NOW() - INTERVAL '7 days')
        WHEN p_time_range = 'month' THEN COUNT(*) FILTER (WHERE qh.answered_at >= DATE_TRUNC('month', NOW()))
        ELSE COUNT(*)
      END
    ) > 0
  ),
  -- Calculate improvement (comparing recent vs older performance)
  user_improvement AS (
    SELECT 
      us.user_id,
      us.level_id,
      us.total_attempts,
      us.correct_count,
      us.distinct_correct,
      us.activity_days,
      qc.total_questions,
      -- Calculate accuracy percentage
      CASE WHEN us.total_attempts > 0 
        THEN ROUND((us.correct_count::numeric / us.total_attempts) * 100, 1)
        ELSE 0 
      END as accuracy_pct,
      -- Calculate ranking score: accuracy * sqrt(total_attempts)
      CASE WHEN us.total_attempts > 0 
        THEN ROUND(
          (us.correct_count::numeric / us.total_attempts * 100) * SQRT(us.total_attempts::numeric), 
          2
        )
        ELSE 0 
      END as calc_ranking_score,
      -- Calculate improvement (simplified - difference in recent accuracy)
      COALESCE((
        SELECT 
          CASE WHEN recent.total > 0 AND older.total > 0 THEN
            ROUND(
              ((recent.correct::numeric / recent.total) - (older.correct::numeric / older.total)) * 100,
              1
            )
          ELSE 0 END
        FROM (
          SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_correct) as correct
          FROM question_history qh2
          INNER JOIN questions q2 ON q2.id = qh2.question_id
          INNER JOIN sections s2 ON s2.id = q2.section_id
          WHERE qh2.user_id = us.user_id 
          AND s2.level_id = us.level_id
          AND qh2.answered_at >= NOW() - INTERVAL '7 days'
        ) recent,
        (
          SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_correct) as correct
          FROM question_history qh3
          INNER JOIN questions q3 ON q3.id = qh3.question_id
          INNER JOIN sections s3 ON s3.id = q3.section_id
          WHERE qh3.user_id = us.user_id 
          AND s3.level_id = us.level_id
          AND qh3.answered_at >= NOW() - INTERVAL '14 days'
          AND qh3.answered_at < NOW() - INTERVAL '7 days'
        ) older
      ), 0) as improvement_pct
    FROM user_stats us
    LEFT JOIN question_counts qc ON qc.level_id = us.level_id
  )
  SELECT 
    ui.user_id,
    COALESCE(p.nickname, p.display_name, 'Người dùng ẩn danh')::text as display_name,
    p.avatar_url::text,
    ui.level_id,
    l.name::text as level_name,
    COALESCE(l.order_index, 0)::integer as level_order_index,
    ui.total_attempts,
    ui.correct_count,
    ui.distinct_correct,
    COALESCE(ui.total_questions, 0)::bigint as total_questions_in_level,
    ui.accuracy_pct as accuracy_percent,
    ui.calc_ranking_score as ranking_score,
    ui.activity_days as streak_days,
    ui.improvement_pct as improvement_percent
  FROM user_improvement ui
  INNER JOIN levels l ON l.id = ui.level_id
  LEFT JOIN profiles p ON p.user_id = ui.user_id
  WHERE 
    -- Filter based on leaderboard type
    CASE 
      WHEN p_leaderboard_type = 'accuracy' THEN ui.total_attempts >= 50 -- Minimum 50 attempts for accuracy board
      WHEN p_leaderboard_type = 'diligent' THEN true
      WHEN p_leaderboard_type = 'progress' THEN ui.total_attempts >= 20 -- Need some attempts to measure progress
      ELSE true -- 'overall'
    END
  ORDER BY 
    l.order_index,
    CASE p_leaderboard_type
      WHEN 'accuracy' THEN ui.accuracy_pct
      WHEN 'diligent' THEN ui.total_attempts::numeric
      WHEN 'progress' THEN ui.improvement_pct
      ELSE ui.calc_ranking_score -- 'overall'
    END DESC,
    ui.total_attempts ASC;
END;
$$;