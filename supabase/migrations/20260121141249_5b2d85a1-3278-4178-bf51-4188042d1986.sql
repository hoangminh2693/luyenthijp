-- Fix: Remove overly permissive profile SELECT policy
-- This policy exposes sensitive personal data (date_of_birth, country) to all authenticated users
-- The leaderboard uses get_leaderboard_by_level() SECURITY DEFINER function which bypasses RLS
-- Users can still view their own profile via "Users can view their own profile" policy

DROP POLICY IF EXISTS "Authenticated can view basic profile info" ON public.profiles;