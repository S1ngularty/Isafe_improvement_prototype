-- ============================================================
-- CityShield — Add rescuer role
-- Updates the CHECK constraint to allow 'rescuer' in profiles.role
-- Adds is_rescuer() SECURITY DEFINER helper function
-- ============================================================

-- 1. Alter the CHECK constraint to include 'rescuer'
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'user', 'rescuer'));

-- 2. Helper function — bypasses RLS to check rescuer status
CREATE OR REPLACE FUNCTION public.is_rescuer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'rescuer'
  );
$$;

-- 3. Helper function — bypasses RLS to check admin or rescuer
CREATE OR REPLACE FUNCTION public.is_admin_or_rescuer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'rescuer')
  );
$$;

-- 4. Extend admin RPC to include rescuer and updated fields
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
  SELECT p.id, p.role, p.is_active, p.full_name, p.barangay, p.created_at, u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
$$;
