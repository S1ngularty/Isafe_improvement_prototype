-- ============================================================
-- CityShield — Realtime + RLS for live rescue/status updates
-- Enables Supabase Realtime signals for admins and rescuers.
-- ============================================================

-- 1. rescue_assignments: broadcast full row on UPDATE/DELETE (live ETA/state).
--    Without REPLICA IDENTITY FULL, only INSERT events are delivered.
ALTER TABLE public.rescue_assignments REPLICA IDENTITY FULL;

-- 2. status_history: allow admins and rescuers to read (for the realtime signal).
--    The existing family-member SELECT policy remains; policies are OR-combined.
DROP POLICY IF EXISTS "Admins and rescuers can read status history" ON public.status_history;

CREATE POLICY "Admins and rescuers can read status history"
  ON public.status_history FOR SELECT
  USING (is_admin_or_rescuer());

-- 3. rescuers: live roster availability for the admin dashboard.
ALTER TABLE public.rescuers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rescuers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rescuers;
  END IF;
END
$$;

-- 4. status_history is already in the publication with REPLICA IDENTITY FULL
--    (see 0015 / 0016). rescue_assignments is already in the publication
--    (see 0020); this migration adds its REPLICA IDENTITY FULL above.
