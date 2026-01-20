-- Add new columns to profiles table for extended user info
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add unique constraint on nickname to prevent duplicates
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_nickname_unique UNIQUE (nickname);

-- Add check constraint for nickname format (alphanumeric, underscore, 3-20 chars)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_nickname_format CHECK (
  nickname IS NULL OR (
    LENGTH(nickname) >= 3 AND 
    LENGTH(nickname) <= 20 AND 
    nickname ~ '^[a-zA-Z0-9_]+$'
  )
);

-- Update the get_leaderboard_by_level function to return nickname instead of display_name
CREATE OR REPLACE FUNCTION public.get_leaderboard_by_level(
  p_level_id UUID DEFAULT NULL,
  p_subject_id UUID DEFAULT NULL,
  p_time_range TEXT DEFAULT 'all'
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  level_id UUID,
  level_name TEXT,
  level_order_index INTEGER,
  total_attempts BIGINT,
  correct_count BIGINT,
  distinct_correct BIGINT,
  total_questions_in_level BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(*) FILTER (WHERE qh.answered_at >= NOW() - INTERVAL '7 days')
        WHEN p_time_range = 'month' THEN COUNT(*) FILTER (WHERE qh.answered_at >= DATE_TRUNC('month', NOW()))
        ELSE COUNT(*)
      END as total_attempts,
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(*) FILTER (WHERE qh.is_correct = true AND qh.answered_at >= NOW() - INTERVAL '7 days')
        WHEN p_time_range = 'month' THEN COUNT(*) FILTER (WHERE qh.is_correct = true AND qh.answered_at >= DATE_TRUNC('month', NOW()))
        ELSE COUNT(*) FILTER (WHERE qh.is_correct = true)
      END as correct_count,
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(DISTINCT CASE WHEN qh.is_correct AND qh.answered_at >= NOW() - INTERVAL '7 days' THEN COALESCE(q.parent_id, q.id) END)
        WHEN p_time_range = 'month' THEN COUNT(DISTINCT CASE WHEN qh.is_correct AND qh.answered_at >= DATE_TRUNC('month', NOW()) THEN COALESCE(q.parent_id, q.id) END)
        ELSE COUNT(DISTINCT CASE WHEN qh.is_correct THEN COALESCE(q.parent_id, q.id) END)
      END as distinct_correct
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
  )
  SELECT 
    us.user_id,
    -- Use nickname if available, otherwise use display_name, otherwise 'Người dùng ẩn danh'
    COALESCE(p.nickname, p.display_name, 'Người dùng ẩn danh')::text as display_name,
    p.avatar_url::text,
    us.level_id,
    l.name::text as level_name,
    COALESCE(l.order_index, 0)::integer as level_order_index,
    us.total_attempts,
    us.correct_count,
    us.distinct_correct,
    COALESCE(qc.total_questions, 0)::bigint as total_questions_in_level
  FROM user_stats us
  INNER JOIN levels l ON l.id = us.level_id
  LEFT JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN question_counts qc ON qc.level_id = us.level_id
  ORDER BY l.order_index, us.distinct_correct DESC, us.correct_count DESC, us.total_attempts ASC;
END;
$$;