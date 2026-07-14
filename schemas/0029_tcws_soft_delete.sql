-- ============================================================
-- CityShield — TCWS Alerts soft delete
-- Adds deleted_at column and updates RLS policies
-- ============================================================

ALTER TABLE public.tcws_alerts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update the public read policy to exclude soft-deleted alerts
DROP POLICY IF EXISTS "Anyone can read active tcws alerts" ON public.tcws_alerts;
CREATE POLICY "Anyone can read active tcws alerts"
  ON public.tcws_alerts FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- Update the admin read policy to show non-deleted alerts by default
DROP POLICY IF EXISTS "Admins can read all tcws alerts" ON public.tcws_alerts;
CREATE POLICY "Admins can read all tcws alerts"
  ON public.tcws_alerts FOR SELECT
  USING (is_admin() AND deleted_at IS NULL);

-- Replace delete policy with soft-delete via UPDATE
DROP POLICY IF EXISTS "Admins can delete tcws alerts" ON public.tcws_alerts;
