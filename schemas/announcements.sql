-- ============================================================
-- CityShield — Announcements table
-- Run in: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'image'
              CHECK (type IN ('image', 'video')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Everyone (authenticated) can read active announcements
CREATE POLICY "Anyone can read active announcements"
  ON public.announcements FOR SELECT
  USING (is_active = true);

-- Admins can read all announcements (including inactive)
CREATE POLICY "Admins can read all announcements"
  ON public.announcements FOR SELECT
  USING (is_admin());

-- Admins can create announcements
CREATE POLICY "Admins can create announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update announcements
CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
  ON public.announcements FOR DELETE
  USING (is_admin());
