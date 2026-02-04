-- Tạo function để lấy thống kê hoạt động công khai
-- Chỉ trả về số liệu tổng hợp, không lộ thông tin cá nhân
CREATE OR REPLACE FUNCTION public.get_public_activity_stats()
RETURNS TABLE (
  recent_attempts bigint,
  active_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as recent_attempts,
    COUNT(DISTINCT user_id)::bigint as active_users
  FROM question_history
  WHERE answered_at >= NOW() - INTERVAL '24 hours';
END;
$$;