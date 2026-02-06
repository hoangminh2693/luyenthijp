-- Fix get_enhanced_leaderboard - add slug column to root_categories CTE

CREATE OR REPLACE FUNCTION public.get_enhanced_leaderboard(
  p_level_id uuid DEFAULT NULL::uuid, 
  p_subject_id uuid DEFAULT NULL::uuid, 
  p_time_range text DEFAULT 'all'::text, 
  p_leaderboard_type text DEFAULT 'overall'::text
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
AS $function$
DECLARE
  v_is_category boolean := false;
  v_is_legacy_level boolean := false;
  v_mapped_legacy_level_id uuid := NULL;
  v_category_slug text := NULL;
  v_category_name text := NULL;
  v_subject_id uuid := NULL;
BEGIN
  -- Check if p_level_id is a category or a legacy level
  IF p_level_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM categories WHERE id = p_level_id) INTO v_is_category;
    
    IF v_is_category THEN
      SELECT c.slug, c.name, c.subject_id 
      INTO v_category_slug, v_category_name, v_subject_id
      FROM categories c 
      WHERE c.id = p_level_id;
      
      SELECT l.id INTO v_mapped_legacy_level_id
      FROM levels l
      WHERE l.subject_id = v_subject_id
        AND (l.slug = v_category_slug OR l.name = v_category_name)
      LIMIT 1;
    ELSE
      SELECT EXISTS(SELECT 1 FROM levels WHERE id = p_level_id) INTO v_is_legacy_level;
      IF v_is_legacy_level THEN
        v_mapped_legacy_level_id := p_level_id;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    SELECT c.id, c.parent_id, c.subject_id
    FROM categories c
    WHERE p_level_id IS NOT NULL 
      AND v_is_category 
      AND (c.id = p_level_id OR c.parent_id = p_level_id)
    UNION
    SELECT c.id, c.parent_id, c.subject_id
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
  ),
  root_categories AS (
    SELECT 
      c.id,
      c.name,
      c.slug,  -- Added slug column
      c.order_index,
      c.subject_id
    FROM categories c
    INNER JOIN subject_layers sl ON sl.id = c.layer_id
    WHERE sl.order_index = 0 AND c.parent_id IS NULL
      AND (p_subject_id IS NULL OR c.subject_id = p_subject_id)
  ),
  question_counts AS (
    SELECT 
      CASE 
        WHEN p_level_id IS NOT NULL THEN p_level_id
        WHEN v_is_category OR (NOT v_is_legacy_level AND p_level_id IS NULL) THEN
          COALESCE(
            (SELECT rc.id FROM root_categories rc WHERE rc.id = q.category_id),
            (SELECT rc.id FROM root_categories rc 
             INNER JOIN categories pc ON pc.id = q.category_id AND pc.parent_id = rc.id),
            (SELECT rc.id FROM root_categories rc
             INNER JOIN categories pc ON pc.parent_id = rc.id
             INNER JOIN categories gc ON gc.parent_id = pc.id AND gc.id = q.category_id),
            (SELECT rc.id FROM root_categories rc
             INNER JOIN levels l ON (l.slug = rc.slug OR l.name = rc.name) AND l.subject_id = rc.subject_id
             WHERE l.id = sec.level_id)
          )
        ELSE
          sec.level_id
      END as group_id,
      COUNT(*)::bigint as total_questions
    FROM questions q
    LEFT JOIN sections sec ON sec.id = q.section_id
    WHERE q.parent_id IS NULL
      AND (
        CASE 
          WHEN v_is_category AND v_mapped_legacy_level_id IS NOT NULL THEN
            q.category_id IN (SELECT id FROM category_tree)
            OR sec.level_id = v_mapped_legacy_level_id
          WHEN v_is_category THEN 
            q.category_id IN (SELECT id FROM category_tree)
          WHEN v_is_legacy_level THEN 
            sec.level_id = p_level_id
          ELSE true
        END
      )
    GROUP BY group_id
  ),
  user_stats AS (
    SELECT 
      qh.user_id,
      CASE 
        WHEN p_level_id IS NOT NULL THEN p_level_id
        WHEN v_is_category OR (NOT v_is_legacy_level AND p_level_id IS NULL) THEN
          COALESCE(
            (SELECT rc.id FROM root_categories rc WHERE rc.id = q.category_id),
            (SELECT rc.id FROM root_categories rc 
             INNER JOIN categories pc ON pc.id = q.category_id AND pc.parent_id = rc.id),
            (SELECT rc.id FROM root_categories rc
             INNER JOIN categories pc ON pc.parent_id = rc.id
             INNER JOIN categories gc ON gc.parent_id = pc.id AND gc.id = q.category_id),
            (SELECT rc.id FROM root_categories rc
             INNER JOIN levels l ON (l.slug = rc.slug OR l.name = rc.name) AND l.subject_id = rc.subject_id
             WHERE l.id = sec.level_id)
          )
        ELSE
          sec.level_id
      END as group_id,
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
      END as distinct_correct,
      (
        SELECT COUNT(DISTINCT DATE(answered_at))::integer
        FROM question_history qh2
        WHERE qh2.user_id = qh.user_id
        AND qh2.answered_at >= NOW() - INTERVAL '30 days'
      ) as activity_days
    FROM question_history qh
    INNER JOIN questions q ON q.id = qh.question_id
    LEFT JOIN sections sec ON sec.id = q.section_id
    LEFT JOIN levels l ON l.id = sec.level_id
    WHERE qh.user_id IS NOT NULL
      AND (
        CASE 
          WHEN v_is_category AND v_mapped_legacy_level_id IS NOT NULL THEN
            q.category_id IN (SELECT id FROM category_tree)
            OR sec.level_id = v_mapped_legacy_level_id
          WHEN v_is_category THEN 
            q.category_id IN (SELECT id FROM category_tree)
          WHEN v_is_legacy_level THEN 
            sec.level_id = p_level_id
          WHEN p_subject_id IS NOT NULL THEN 
            l.subject_id = p_subject_id OR q.category_id IN (SELECT id FROM categories WHERE subject_id = p_subject_id)
          ELSE true
        END
      )
    GROUP BY qh.user_id, group_id
    HAVING (
      CASE 
        WHEN p_time_range = 'week' THEN COUNT(*) FILTER (WHERE qh.answered_at >= NOW() - INTERVAL '7 days')
        WHEN p_time_range = 'month' THEN COUNT(*) FILTER (WHERE qh.answered_at >= DATE_TRUNC('month', NOW()))
        ELSE COUNT(*)
      END
    ) > 0
  ),
  user_improvement AS (
    SELECT 
      us.user_id,
      us.group_id,
      us.total_attempts,
      us.correct_count,
      us.distinct_correct,
      us.activity_days,
      qc.total_questions,
      CASE WHEN us.total_attempts > 0 
        THEN ROUND((us.correct_count::numeric / us.total_attempts) * 100, 1)
        ELSE 0 
      END as accuracy_pct,
      CASE WHEN us.total_attempts > 0 
        THEN ROUND(
          (us.correct_count::numeric / us.total_attempts * 100) * SQRT(us.total_attempts::numeric), 
          2
        )
        ELSE 0 
      END as calc_ranking_score,
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
          WHERE qh2.user_id = us.user_id 
          AND qh2.answered_at >= NOW() - INTERVAL '7 days'
        ) recent,
        (
          SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_correct) as correct
          FROM question_history qh3
          INNER JOIN questions q3 ON q3.id = qh3.question_id
          WHERE qh3.user_id = us.user_id 
          AND qh3.answered_at >= NOW() - INTERVAL '14 days'
          AND qh3.answered_at < NOW() - INTERVAL '7 days'
        ) older
      ), 0) as improvement_pct
    FROM user_stats us
    LEFT JOIN question_counts qc ON qc.group_id = us.group_id
    WHERE us.group_id IS NOT NULL
  )
  SELECT 
    ui.user_id,
    COALESCE(p.nickname, p.display_name, 'Người dùng ẩn danh')::text as display_name,
    p.avatar_url::text,
    ui.group_id as level_id,
    COALESCE(
      (SELECT name FROM root_categories WHERE id = ui.group_id),
      (SELECT name FROM levels WHERE id = ui.group_id),
      (SELECT name FROM categories WHERE id = p_level_id),
      (SELECT name FROM levels WHERE id = p_level_id),
      'Unknown'
    )::text as level_name,
    COALESCE(
      (SELECT order_index FROM root_categories WHERE id = ui.group_id),
      (SELECT order_index FROM levels WHERE id = ui.group_id),
      (SELECT order_index FROM categories WHERE id = p_level_id),
      (SELECT order_index FROM levels WHERE id = p_level_id),
      0
    )::integer as level_order_index,
    ui.total_attempts,
    ui.correct_count,
    ui.distinct_correct,
    COALESCE(ui.total_questions, 0)::bigint as total_questions_in_level,
    ui.accuracy_pct as accuracy_percent,
    ui.calc_ranking_score as ranking_score,
    ui.activity_days as streak_days,
    ui.improvement_pct as improvement_percent
  FROM user_improvement ui
  LEFT JOIN profiles p ON p.user_id = ui.user_id
  WHERE 
    CASE 
      WHEN p_leaderboard_type = 'accuracy' THEN ui.total_attempts >= 50
      WHEN p_leaderboard_type = 'diligent' THEN true
      WHEN p_leaderboard_type = 'progress' THEN ui.total_attempts >= 20
      ELSE true
    END
  ORDER BY 
    level_order_index,
    CASE p_leaderboard_type
      WHEN 'accuracy' THEN ui.accuracy_pct
      WHEN 'diligent' THEN ui.total_attempts::numeric
      WHEN 'progress' THEN ui.improvement_pct
      ELSE ui.calc_ranking_score
    END DESC,
    ui.total_attempts ASC;
END;
$function$;