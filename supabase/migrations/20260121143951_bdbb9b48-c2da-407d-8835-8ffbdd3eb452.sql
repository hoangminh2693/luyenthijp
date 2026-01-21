-- Fix: Restrict question_history SELECT to only authenticated users' own history
-- This prevents anonymous users from seeing ALL anonymous records

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can read their own history or anonymous" ON question_history;

-- Create a new restrictive policy: Only authenticated users can read their own history
CREATE POLICY "Users can read their own history"
ON question_history FOR SELECT
USING (
  user_id IS NOT NULL AND auth.uid() = user_id
);

-- Also fix INSERT policy to require user_id match for authenticated users
-- and allow anonymous inserts (user_id IS NULL) only for truly anonymous users
DROP POLICY IF EXISTS "Users can insert their own history" ON question_history;

CREATE POLICY "Users can insert their own history"
ON question_history FOR INSERT
WITH CHECK (
  -- Either: anonymous insert (no user_id) when not logged in
  (user_id IS NULL AND auth.uid() IS NULL)
  OR 
  -- Or: authenticated insert with matching user_id
  (user_id IS NOT NULL AND auth.uid() = user_id)
);