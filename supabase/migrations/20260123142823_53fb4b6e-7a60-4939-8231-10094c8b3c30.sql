-- Security hardening (warn-level): isolate profile PII + remove device tracking from answer history

BEGIN;

-- 1) Move PII (date_of_birth, country) out of public.profiles into a private table
CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id uuid PRIMARY KEY,
  date_of_birth date,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_private' AND policyname='Users can view their own private profile'
  ) THEN
    CREATE POLICY "Users can view their own private profile"
    ON public.profile_private
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_private' AND policyname='Users can insert their own private profile'
  ) THEN
    CREATE POLICY "Users can insert their own private profile"
    ON public.profile_private
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_private' AND policyname='Users can update their own private profile'
  ) THEN
    CREATE POLICY "Users can update their own private profile"
    ON public.profile_private
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Keep updated_at fresh (function already exists)
DROP TRIGGER IF EXISTS update_profile_private_updated_at ON public.profile_private;
CREATE TRIGGER update_profile_private_updated_at
BEFORE UPDATE ON public.profile_private
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill/migrate existing profile data
INSERT INTO public.profile_private (user_id, date_of_birth, country)
SELECT user_id, date_of_birth, country
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE
SET date_of_birth = EXCLUDED.date_of_birth,
    country = EXCLUDED.country;

-- Remove PII columns from public.profiles (keep nickname/avatar/display_name for leaderboard)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS country;


-- 2) Remove device_id tracking from database answer history and require authentication for inserts
-- Delete any previously inserted anonymous rows (no longer used)
DELETE FROM public.question_history WHERE user_id IS NULL;

-- Drop device_id column entirely (not needed once anonymous history is local-only)
ALTER TABLE public.question_history DROP COLUMN IF EXISTS device_id;

-- Ensure all history rows belong to a user
ALTER TABLE public.question_history ALTER COLUMN user_id SET NOT NULL;

-- Tighten INSERT policy: authenticated users only
DROP POLICY IF EXISTS "Users can insert their own history" ON public.question_history;
CREATE POLICY "Users can insert their own history"
ON public.question_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

COMMIT;