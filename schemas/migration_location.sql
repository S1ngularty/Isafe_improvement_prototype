-- ============================================================
-- CityShield — Migration: Add location + status columns
-- Run in: Supabase SQL Editor
-- Safe to run on existing profiles table (no DROP)
-- ============================================================

-- Add new columns (IF NOT EXISTS via DO block)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN lat DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN lng DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN last_seen_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN location_sharing BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'safe';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add status check constraint (if not exists)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('safe', 'help', 'emergency'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add UPDATE policy for users to write their own row
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
