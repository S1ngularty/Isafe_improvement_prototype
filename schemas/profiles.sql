-- ============================================================
-- CityShield — Profiles table + RBAC schema
-- Run in: Supabase SQL Editor
-- ============================================================

-- 0. Clean up existing policies (in case of re-run)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- 1. Create profiles table
DROP TABLE IF EXISTS public.profiles;
CREATE TABLE public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'user'
            CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  full_name TEXT,
  barangay  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Helper function — bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. RLS: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 5. RLS: Admins can read all profiles (uses is_admin() to avoid recursion)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

-- 6. RLS: Admins can update any profile
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 7. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, barangay)
  VALUES (
    new.id,
    'user',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'barangay'
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. RPC: Admin fetches all profiles with emails (bypasses RLS)
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

-- ============================================================
-- After running this, set yourself as admin:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = '<your-user-uuid>';
-- ============================================================
