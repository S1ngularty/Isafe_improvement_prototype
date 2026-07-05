-- ============================================================
-- CityShield — Status History table + trigger + RLS
-- Logs every status change on profiles for family alert history
-- ============================================================

-- 1. Create status_history table
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  previous_status TEXT CHECK (previous_status IN ('safe', 'help', 'emergency')),
  new_status TEXT NOT NULL CHECK (new_status IN ('safe', 'help', 'emergency')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_status_history_family_created
  ON public.status_history (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_history_user_created
  ON public.status_history (user_id, created_at DESC);

-- 3. Trigger function: auto-log status changes on profiles
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.status_history (user_id, family_id, previous_status, new_status, lat, lng)
  VALUES (NEW.id, NEW.family_id, OLD.status, NEW.status, NEW.lat, NEW.lng);
  RETURN NEW;
END;
$$;

-- 4. Apply trigger to profiles table
DROP TRIGGER IF EXISTS on_profile_status_update ON public.profiles;

CREATE TRIGGER on_profile_status_update
  AFTER UPDATE OF status ON public.profiles
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_status_change();

-- 5. Enable RLS
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS: family members can read history for their family
DROP POLICY IF EXISTS "Family members can read status history" ON public.status_history;

CREATE POLICY "Family members can read status history"
  ON public.status_history FOR SELECT
  USING (
    family_id IN (
      SELECT p.family_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
