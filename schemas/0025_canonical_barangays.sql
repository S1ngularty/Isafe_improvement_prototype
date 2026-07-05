-- ============================================================
-- CityShield — Canonical Barangays Table + Migrate profiles
-- and analytics_barangay_snapshot from free-text to FK references
-- ============================================================

-- 1. Create barangays table
CREATE TABLE IF NOT EXISTS public.barangays (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seed all 45 barangays (order must match website/src/utils/barangayOptions.js)
INSERT INTO public.barangays (name) VALUES
    ('Aldavoc'),
    ('Aliji'),
    ('Bagong Silang'),
    ('Bambán'),
    ('Bosigon'),
    ('Bukál'),
    ('Cabibihan'),
    ('Cabugwang'),
    ('Cagascas'),
    ('Candalapdap'),
    ('Casispalan'),
    ('Colong-colong'),
    ('Del Rosario'),
    ('Katimo'),
    ('Kinatakutan'),
    ('Landing'),
    ('Laurel'),
    ('Magsaysáy'),
    ('Maguibuay'),
    ('Mahinta'),
    ('Malbog'),
    ('Manato Central'),
    ('Manato Station'),
    ('Mangayao'),
    ('Mansilay'),
    ('Mapulot'),
    ('Muntíng Parang'),
    ('Payapà'),
    ('Población'),
    ('Rizal'),
    ('Sabang'),
    ('San Diego'),
    ('San Francisco'),
    ('San Isidro'),
    ('San Roque'),
    ('San Vicente'),
    ('Santa Cecilia'),
    ('Santa Monica'),
    ('Santo Niño I'),
    ('Santo Niño II'),
    ('Santo Tomás'),
    ('Seguiwan'),
    ('Tabason'),
    ('Tunton'),
    ('Victoria')
ON CONFLICT (name) DO NOTHING;

-- 3. Migrate public.profiles
ALTER TABLE public.profiles
    ADD COLUMN barangay_id INTEGER REFERENCES public.barangays(id);

UPDATE public.profiles p
SET barangay_id = b.id
FROM public.barangays b
WHERE b.name = p.barangay;

-- Insert any missing barangay names found in profiles so no row is orphaned
INSERT INTO public.barangays (name)
SELECT DISTINCT p.barangay
FROM public.profiles p
LEFT JOIN public.barangays b ON b.name = p.barangay
WHERE b.id IS NULL AND p.barangay IS NOT NULL;

-- Retry the backfill for newly inserted barangays
UPDATE public.profiles p
SET barangay_id = b.id
FROM public.barangays b
WHERE b.name = p.barangay AND p.barangay_id IS NULL;

-- Profiles with NULL/empty barangay — assign Población as fallback
UPDATE public.profiles
SET barangay_id = (SELECT id FROM public.barangays WHERE name = 'Población')
WHERE barangay_id IS NULL;

ALTER TABLE public.profiles
    ALTER COLUMN barangay_id SET NOT NULL;

ALTER TABLE public.profiles DROP COLUMN barangay;

-- 4. Update signup trigger — reads barangay_id from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, barangay_id, phone_number,
    street_address, date_of_birth
  ) VALUES (
    new.id,
    'user',
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'barangay_id')::INTEGER,
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'street_address',
    new.raw_user_meta_data->>'date_of_birth'
  );
  RETURN new;
END;
$$;

-- 5. Update get_all_profiles RPC — join with barangays to return name
DROP FUNCTION IF EXISTS public.get_all_profiles();
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
  id UUID,
  role TEXT,
  is_active BOOLEAN,
  full_name TEXT,
  barangay TEXT,
  created_at TIMESTAMPTZ,
  email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.role, p.is_active, p.full_name, b.name AS barangay,
         p.created_at, u.email
  FROM public.profiles p
  JOIN public.barangays b ON b.id = p.barangay_id
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
$$;

-- 6. Migrate analytics_barangay_snapshot
ALTER TABLE public.analytics_barangay_snapshot
    ADD COLUMN barangay_id INTEGER REFERENCES public.barangays(id);

UPDATE public.analytics_barangay_snapshot s
SET barangay_id = b.id
FROM public.barangays b
WHERE b.name = s.barangay;

ALTER TABLE public.analytics_barangay_snapshot
    ALTER COLUMN barangay_id SET NOT NULL;

-- Drop dependent view first so the column can be dropped
DROP VIEW IF EXISTS public.vw_barangay_latest;

-- Drop old PK, create new PK with barangay_id
ALTER TABLE public.analytics_barangay_snapshot
    DROP CONSTRAINT analytics_barangay_snapshot_pkey;

ALTER TABLE public.analytics_barangay_snapshot
    ADD PRIMARY KEY (date, barangay_id);

-- Replace old index
DROP INDEX IF EXISTS idx_analytics_barangay_snapshot_barangay_date;
CREATE INDEX idx_analytics_barangay_snapshot_barangay_id_date
    ON public.analytics_barangay_snapshot (barangay_id, date DESC);

-- Drop the old free-text column (view already removed above)
ALTER TABLE public.analytics_barangay_snapshot DROP COLUMN barangay;

-- 7. RLS for barangays table
ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read barangays" ON public.barangays;
CREATE POLICY "Anyone can read barangays"
    ON public.barangays FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role insert barangays" ON public.barangays;
CREATE POLICY "Service role insert barangays"
    ON public.barangays FOR INSERT
    WITH CHECK (false);

DROP POLICY IF EXISTS "Service role update barangays" ON public.barangays;
CREATE POLICY "Service role update barangays"
    ON public.barangays FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Service role delete barangays" ON public.barangays;
CREATE POLICY "Service role delete barangays"
    ON public.barangays FOR DELETE
    USING (false);

-- 8. Recreate vw_barangay_latest view (dropped in step 6)
CREATE OR REPLACE VIEW public.vw_barangay_latest AS
SELECT DISTINCT ON (s.barangay_id)
    s.date,
    s.barangay_id,
    b.name AS barangay,
    s.total_users,
    s.users_emergency,
    s.users_help,
    s.users_safe,
    s.vulnerable_users,
    s.incidents_today,
    s.resolved_today
FROM public.analytics_barangay_snapshot s
JOIN public.barangays b ON b.id = s.barangay_id
ORDER BY s.barangay_id, s.date DESC;
