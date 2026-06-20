-- ============================================================
-- CityShield — Family Location Tracking
-- Run in: Supabase SQL Editor
-- Safe to run on existing tables (no DROP on profiles)
-- ============================================================

-- 1. Create families table
CREATE TABLE IF NOT EXISTS public.families (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- 2. Add family_id to profiles BEFORE any RLS policies that reference it
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add updated_at to profiles (required by AGENTS.md)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Auto-set updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_families_updated_at ON public.families;
CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Unique family code generator
CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    IF NOT EXISTS (SELECT 1 FROM public.families WHERE code = new_code) THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- 6. Helper: get my family ID
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 7. RPC: Create a family (max one per user)
CREATE OR REPLACE FUNCTION public.create_family(family_name TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid          UUID := auth.uid();
  existing_id  UUID;
  new_id       UUID;
  new_code     TEXT;
  result       json;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT family_id INTO existing_id FROM public.profiles WHERE id = uid;
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Already in a family. Leave your current family first.';
  END IF;

  new_code := public.generate_family_code();
  INSERT INTO public.families (name, code, created_by)
  VALUES (family_name, new_code, uid)
  RETURNING id INTO new_id;

  UPDATE public.profiles SET family_id = new_id WHERE id = uid;

  SELECT json_build_object(
    'id', new_id,
    'name', family_name,
    'code', new_code
  ) INTO result;

  RETURN result;
END;
$$;

-- 8. RPC: Join a family by code
CREATE OR REPLACE FUNCTION public.join_family(family_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid           UUID := auth.uid();
  existing_fid  UUID;
  target_fid    UUID;
  member_count  INT;
  family_name   TEXT;
  result        json;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT family_id INTO existing_fid FROM public.profiles WHERE id = uid;
  IF existing_fid IS NOT NULL THEN
    RAISE EXCEPTION 'Already in a family. Leave your current family first.';
  END IF;

  SELECT id, name INTO target_fid, family_name
  FROM public.families
  WHERE code = UPPER(family_code);

  IF target_fid IS NULL THEN
    RAISE EXCEPTION 'Invalid family code. Please check and try again.';
  END IF;

  SELECT COUNT(*) INTO member_count
  FROM public.profiles
  WHERE family_id = target_fid;

  IF member_count >= 15 THEN
    RAISE EXCEPTION 'This family is full (max 15 members).';
  END IF;

  UPDATE public.profiles SET family_id = target_fid WHERE id = uid;

  SELECT json_build_object(
    'id', target_fid,
    'name', family_name,
    'code', family_code
  ) INTO result;

  RETURN result;
END;
$$;

-- 9. RPC: Get family members (name + location + status)
CREATE OR REPLACE FUNCTION public.get_family_members()
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
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
  SELECT p.id, p.full_name, p.lat, p.lng, p.status, p.last_seen_at, p.location_sharing
  FROM public.profiles p
  JOIN public.profiles me ON p.family_id = me.family_id
  WHERE me.id = auth.uid()
    AND p.id != auth.uid()
    AND p.family_id IS NOT NULL;
$$;

-- 10. RPC: Leave current family
CREATE OR REPLACE FUNCTION public.leave_family()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid UUID := auth.uid();
  fid UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT family_id INTO fid FROM public.profiles WHERE id = uid;
  IF fid IS NULL THEN
    RAISE EXCEPTION 'You are not in a family.';
  END IF;

  UPDATE public.profiles SET family_id = NULL WHERE id = uid;

  -- Delete family if no members left
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE family_id = fid) THEN
    DELETE FROM public.families WHERE id = fid;
  END IF;
END;
$$;

-- 11. RLS: Family members can read their own family row
-- Uses SECURITY DEFINER function to avoid infinite recursion
DROP POLICY IF EXISTS "Family members can read their family" ON public.families;
CREATE POLICY "Family members can read their family"
  ON public.families FOR SELECT
  USING (id = public.get_my_family_id());

-- 12. RLS: Family creator can update family name
DROP POLICY IF EXISTS "Creator can update family" ON public.families;
CREATE POLICY "Creator can update family"
  ON public.families FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- 13. RLS: Family members can read each other's profiles
-- Uses SECURITY DEFINER function to avoid infinite recursion
DROP POLICY IF EXISTS "Family members can read each other" ON public.profiles;
CREATE POLICY "Family members can read each other"
  ON public.profiles FOR SELECT
  USING (
    id != auth.uid()
    AND family_id IS NOT NULL
    AND family_id = public.get_my_family_id()
  );

-- 14. RLS: Users can update their own family_id (join/leave)
DROP POLICY IF EXISTS "Users can update own family_id" ON public.profiles;
CREATE POLICY "Users can update own family_id"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
