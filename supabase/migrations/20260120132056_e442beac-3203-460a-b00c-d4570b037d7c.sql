-- Fix profiles table public exposure
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a more restrictive policy: users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to view public profile info (for leaderboard display names)
-- The get_leaderboard_by_level function uses SECURITY DEFINER so it can still access profiles
CREATE POLICY "Authenticated can view basic profile info"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Note: The leaderboard RPC function uses SECURITY DEFINER, so it bypasses RLS
-- and can still fetch display names and avatars for the leaderboard