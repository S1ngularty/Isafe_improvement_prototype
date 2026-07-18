-- ============================================================
-- Migration 0035: Update get_family_members to exclude self
-- and return avatar_url
-- ============================================================
-- Fixes duplicate map markers on the dashboard where the
-- current user appeared both as a self marker and as a
-- family member marker at the same location.
-- Also ensures avatar_url is returned so family member
-- markers show uploaded profile photos instead of initials.
-- ============================================================
-- Run in: Supabase SQL Editor
-- Safe to run: drops and recreates the function
-- Note: Supersedes the get_family_members definition in
-- schemas/avatars.sql and schemas/migration_profile_fields.sql
-- ============================================================

DROP FUNCTION IF EXISTS public.get_family_members();

CREATE FUNCTION public.get_family_members()
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  status          TEXT,
  last_seen_at    TIMESTAMPTZ,
  location_sharing BOOLEAN,
  avatar_url      TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.full_name, p.lat, p.lng, p.status, p.last_seen_at, p.location_sharing, p.avatar_url
  FROM public.profiles p
  JOIN public.profiles me ON p.family_id = me.family_id
  WHERE me.id = auth.uid()
    AND p.id != auth.uid()
    AND p.family_id IS NOT NULL;
$$;
