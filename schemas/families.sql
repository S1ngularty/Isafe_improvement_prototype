-- ============================================================
-- CityShield — Family Location Tracking + Control System
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

-- 2. Add family_id and family_role to profiles
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN family_role TEXT DEFAULT 'member';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_family_role_check CHECK (family_role IN ('head', 'co_head', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add updated_at to profiles
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

-- 7. Helper: get my family role
CREATE OR REPLACE FUNCTION public.get_my_family_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT family_role FROM public.profiles WHERE id = auth.uid();
$$;

-- 8. RPC: Create a family (creator becomes head)
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

  UPDATE public.profiles SET family_id = new_id, family_role = 'head' WHERE id = uid;

  SELECT json_build_object(
    'id', new_id, 'name', family_name, 'code', new_code
  ) INTO result;

  RETURN result;
END;
$$;

-- 9. RPC: Join a family (new member gets 'member' role)
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

  SELECT COUNT(*) INTO member_count FROM public.profiles WHERE family_id = target_fid;
  IF member_count >= 15 THEN
    RAISE EXCEPTION 'This family is full (max 15 members).';
  END IF;

  UPDATE public.profiles SET family_id = target_fid, family_role = 'member' WHERE id = uid;

  SELECT json_build_object(
    'id', target_fid, 'name', family_name, 'code', family_code
  ) INTO result;

  RETURN result;
END;
$$;

-- 10. RPC: Remove a family member (head/co-head only)
CREATE OR REPLACE FUNCTION public.remove_family_member(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id     UUID := auth.uid();
  caller_role   TEXT;
  target_role   TEXT;
  my_family_id  UUID;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT family_id, family_role INTO my_family_id, caller_role FROM public.profiles WHERE id = caller_id;
  SELECT family_role INTO target_role FROM public.profiles WHERE id = target_id;

  IF my_family_id IS NULL THEN RAISE EXCEPTION 'You are not in a family'; END IF;
  IF target_id = caller_id THEN RAISE EXCEPTION 'Cannot remove yourself. Use leave instead.'; END IF;

  IF caller_role = 'head' THEN
    -- head can remove anyone
    IF target_role = 'head' THEN RAISE EXCEPTION 'Head cannot be removed.'; END IF;
  ELSIF caller_role = 'co_head' THEN
    -- co-head can only remove members
    IF target_role != 'member' THEN RAISE EXCEPTION 'Only the head can remove co-heads.'; END IF;
  ELSE
    RAISE EXCEPTION 'Only head or co-head can remove members.';
  END IF;

  UPDATE public.profiles SET family_id = NULL, family_role = NULL WHERE id = target_id;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE family_id = my_family_id) THEN
    DELETE FROM public.families WHERE id = my_family_id;
  END IF;
END;
$$;

-- 11. RPC: Promote a member to co-head (head only)
CREATE OR REPLACE FUNCTION public.promote_family_member(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id     UUID := auth.uid();
  caller_role   TEXT;
  target_role   TEXT;
  my_family_id  UUID;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT family_id, family_role INTO my_family_id, caller_role FROM public.profiles WHERE id = caller_id;
  SELECT family_role INTO target_role FROM public.profiles WHERE id = target_id;

  IF caller_role != 'head' THEN RAISE EXCEPTION 'Only the family head can promote members.'; END IF;
  IF target_id = caller_id THEN RAISE EXCEPTION 'Cannot promote yourself.'; END IF;
  IF target_role = 'co_head' THEN RAISE EXCEPTION 'Already a co-head.'; END IF;
  IF target_role = 'head' THEN RAISE EXCEPTION 'Cannot promote the head.'; END IF;

  UPDATE public.profiles SET family_role = 'co_head' WHERE id = target_id;
END;
$$;

-- 12. RPC: Demote a co-head to member (head only)
CREATE OR REPLACE FUNCTION public.demote_family_member(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id     UUID := auth.uid();
  caller_role   TEXT;
  target_role   TEXT;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT family_role INTO caller_role FROM public.profiles WHERE id = caller_id;
  SELECT family_role INTO target_role FROM public.profiles WHERE id = target_id;

  IF caller_role != 'head' THEN RAISE EXCEPTION 'Only the family head can demote members.'; END IF;
  IF target_id = caller_id THEN RAISE EXCEPTION 'Cannot demote yourself.'; END IF;
  IF target_role != 'co_head' THEN RAISE EXCEPTION 'Only co-heads can be demoted.'; END IF;

  UPDATE public.profiles SET family_role = 'member' WHERE id = target_id;
END;
$$;

-- 13. RPC: Get all family members (including self, with role)
CREATE OR REPLACE FUNCTION public.get_family_members()
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  phone_number    TEXT,
  family_role     TEXT,
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
  SELECT p.id, p.full_name, p.phone_number, p.family_role,
         p.lat, p.lng, p.status, p.last_seen_at, p.location_sharing
  FROM public.profiles p
  JOIN public.profiles me ON p.family_id = me.family_id
  WHERE me.id = auth.uid()
    AND p.family_id IS NOT NULL;
$$;

-- 14. RPC: Leave current family (with auto-promotion)
CREATE OR REPLACE FUNCTION public.leave_family()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid UUID := auth.uid();
  fid UUID;
  my_role TEXT;
  successor UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT family_id, family_role INTO fid, my_role FROM public.profiles WHERE id = uid;
  IF fid IS NULL THEN RAISE EXCEPTION 'You are not in a family.'; END IF;

  UPDATE public.profiles SET family_id = NULL, family_role = NULL WHERE id = uid;

  -- If head left, auto-promote a successor
  IF my_role = 'head' THEN
    -- Try co-head first, then oldest member
    SELECT id INTO successor FROM public.profiles
    WHERE family_id = fid AND id != uid
    ORDER BY family_role = 'co_head' DESC, created_at ASC
    LIMIT 1;

    IF successor IS NOT NULL THEN
      UPDATE public.profiles SET family_role = 'head' WHERE id = successor;
    END IF;
  END IF;

  -- Delete family if no members left
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE family_id = fid) THEN
    DELETE FROM public.families WHERE id = fid;
  END IF;
END;
$$;

-- 15. RLS: Family members can read their own family row
DROP POLICY IF EXISTS "Family members can read their family" ON public.families;
CREATE POLICY "Family members can read their family"
  ON public.families FOR SELECT
  USING (id = public.get_my_family_id());

-- 16. RLS: Creator can update family name
DROP POLICY IF EXISTS "Creator can update family" ON public.families;
CREATE POLICY "Creator can update family"
  ON public.families FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- 17. RLS: Family members can read each other's profiles
DROP POLICY IF EXISTS "Family members can read each other" ON public.profiles;
CREATE POLICY "Family members can read each other"
  ON public.profiles FOR SELECT
  USING (
    id != auth.uid()
    AND family_id IS NOT NULL
    AND family_id = public.get_my_family_id()
  );

-- 18. RLS: Users can update their own family_id/family_role (join/leave/promote)
DROP POLICY IF EXISTS "Users can update own family_id" ON public.profiles;
CREATE POLICY "Users can update own family_id"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
