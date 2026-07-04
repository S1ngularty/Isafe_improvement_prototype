-- ============================================================
-- CityShield — Rescue Assignments table
-- Tracks rescuer-to-victim assignments, state, aid type, live position
-- ============================================================

-- 1. Create rescue_assignments table
CREATE TABLE IF NOT EXISTS public.rescue_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rescuer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status_history_id UUID REFERENCES public.status_history(id) ON DELETE SET NULL,

  state             TEXT NOT NULL DEFAULT 'en_route'
                    CHECK (state IN ('en_route', 'on_scene', 'helped', 'cancelled')),
  aid_type          TEXT
                    CHECK (aid_type IN (
                      'first_aid', 'transported_to_hospital', 'evacuated',
                      'food_water', 'search_rescue', 'other'
                    )),
  notes             TEXT,
  resolution_note   TEXT,

  rescuer_lat       DOUBLE PRECISION,
  rescuer_lng       DOUBLE PRECISION,
  last_position_at  TIMESTAMPTZ,
  eta_seconds       INTEGER,
  distance_meters   REAL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.rescue_assignments ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Rescuers read all"
  ON public.rescue_assignments FOR SELECT
  USING (is_admin_or_rescuer() OR target_user_id = auth.uid());

CREATE POLICY "Rescuers insert own"
  ON public.rescue_assignments FOR INSERT
  WITH CHECK (is_admin_or_rescuer());

CREATE POLICY "Rescuers update own"
  ON public.rescue_assignments FOR UPDATE
  USING (rescuer_id = auth.uid() OR is_admin())
  WITH CHECK (rescuer_id = auth.uid() OR is_admin());

CREATE POLICY "Admins delete"
  ON public.rescue_assignments FOR DELETE
  USING (is_admin());

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_rescue_assignments_rescuer
  ON public.rescue_assignments (rescuer_id, state);

CREATE INDEX IF NOT EXISTS idx_rescue_assignments_target
  ON public.rescue_assignments (target_user_id, state);

CREATE INDEX IF NOT EXISTS idx_rescue_assignments_state
  ON public.rescue_assignments (state, created_at DESC);

-- 5. Enable realtime for live position updates
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.rescue_assignments;
