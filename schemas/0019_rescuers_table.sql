-- ============================================================
-- CityShield — Rescuers detail table
-- Stores rescuer-specific profile data separate from profiles
-- Auto-row-created via trigger when admin promotes someone
-- ============================================================

-- 1. Create rescuer detail table
CREATE TABLE IF NOT EXISTS public.rescuers (
  id           UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization TEXT,
  rescuer_type TEXT NOT NULL DEFAULT 'general'
                CHECK (rescuer_type IN ('medical', 'fire', 'search_rescue', 'general', 'logistics')),
  availability TEXT NOT NULL DEFAULT 'off_duty'
                CHECK (availability IN ('available', 'on_duty', 'off_duty')),
  certification TEXT,
  contact_number TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.rescuers ENABLE ROW LEVEL SECURITY;

-- 3. RLS: rescuer reads/updates own
CREATE POLICY "Rescuers can read own"
  ON public.rescuers FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Rescuers can update own"
  ON public.rescuers FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can insert"
  ON public.rescuers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete"
  ON public.rescuers FOR DELETE
  USING (is_admin());

-- 4. Trigger: auto-create rescuer row when profile role changes to 'rescuer'
CREATE OR REPLACE FUNCTION public.handle_rescuer_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'rescuer' AND (OLD.role IS NULL OR OLD.role <> 'rescuer') THEN
    INSERT INTO public.rescuers (id, rescuer_type, availability)
    VALUES (NEW.id, 'general', 'off_duty')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_rescuer ON public.profiles;

CREATE TRIGGER on_profile_role_rescuer
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'rescuer' AND (OLD.role IS DISTINCT FROM 'rescuer'))
  EXECUTE FUNCTION public.handle_rescuer_promotion();

-- 5. Index for availability queries
CREATE INDEX IF NOT EXISTS idx_rescuers_availability
  ON public.rescuers (availability);
