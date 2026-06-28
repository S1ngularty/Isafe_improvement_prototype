-- ============================================================
-- CityShield — Migration: Add profile fields (phone, dob, gender)
-- Run in: Supabase SQL Editor
-- Safe to run on existing tables (IF NOT EXISTS via DO block)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN date_of_birth TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN gender TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update get_family_members RPC to return phone_number
CREATE OR REPLACE FUNCTION public.get_family_members()
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  phone_number    TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  status          TEXT,
  last_seen_at    TIMESTAMPTZ,
  location_sharing BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.full_name, p.phone_number, p.lat, p.lng, p.status, p.last_seen_at, p.location_sharing
  FROM public.profiles p
  JOIN public.profiles me ON p.family_id = me.family_id
  WHERE me.id = auth.uid()
    AND p.id != auth.uid()
    AND p.family_id IS NOT NULL;
$$;
