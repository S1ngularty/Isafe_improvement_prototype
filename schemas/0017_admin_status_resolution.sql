-- ============================================================
-- CityShield — Admin Status Resolution Fields
-- Adds resolution tracking to status_history table
-- Run in: Supabase SQL Editor
-- ============================================================

ALTER TABLE public.status_history
ADD COLUMN IF NOT EXISTS resolution_note TEXT,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.status_history.resolution_note IS 'Admin note added when resolving a user status';
COMMENT ON COLUMN public.status_history.resolved_by IS 'Admin user ID who resolved the status';
