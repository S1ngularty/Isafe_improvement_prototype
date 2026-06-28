-- ============================================================
-- CityShield — Migration: Family role column
-- Run in: Supabase SQL Editor
-- Safe to run on existing tables
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN family_role TEXT DEFAULT 'member';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_family_role_check CHECK (family_role IN ('head', 'co_head', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
