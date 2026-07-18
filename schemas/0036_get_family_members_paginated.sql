-- ============================================================
-- Migration 0036: Paginated get_family_members for infinite scroll
-- ============================================================
-- Adds a new RPC get_family_members_paginated(page_limit, page_offset)
-- for use by the EmergencyContactsPanel infinite scroll component.
-- Returns page_limit rows offset by page_offset, plus total_count
-- in every row for the frontend to know when all pages are loaded.
-- Also includes phone_number which migration 0035 dropped.
-- ============================================================
-- Run in: Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_family_members_paginated(
  page_limit  INTEGER DEFAULT 10,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id               UUID,
  full_name        TEXT,
  phone_number     TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  status           TEXT,
  last_seen_at     TIMESTAMPTZ,
  location_sharing BOOLEAN,
  avatar_url       TEXT,
  total_count      BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH family_members AS (
    SELECT p.id, p.full_name, p.phone_number, p.lat, p.lng,
           p.status, p.last_seen_at, p.location_sharing, p.avatar_url
    FROM public.profiles p
    JOIN public.profiles me ON p.family_id = me.family_id
    WHERE me.id = auth.uid()
      AND p.id != auth.uid()
      AND p.family_id IS NOT NULL
  ),
  total AS (
    SELECT COUNT(*)::BIGINT AS cnt FROM family_members
  )
  SELECT fm.*, total.cnt
  FROM family_members fm, total
  ORDER BY fm.full_name ASC
  LIMIT page_limit
  OFFSET page_offset;
$$;
